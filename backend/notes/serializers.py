from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import ProhibitSurrogateCharactersValidator

from core.constants import BATCH_YEARS, MAX_NOTES_PER_USER, TOPIC_TITLES

from .models import Note

BOX_MAX = 20000


def _valid_utf8(value):
    try:
        value.encode("utf-8")
    except UnicodeEncodeError:
        raise serializers.ValidationError("Text contains characters that cannot be saved.")


class FastTextField(serializers.CharField):
    """CharField for the long answer boxes.

    DRF's built-in surrogate-character check loops over every character in Python, which dominates the cost of
    an autosave on a 20,000-character answer. Encoding to UTF-8 rejects exactly the same bad input, in C.
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.validators = [v for v in self.validators if not isinstance(v, ProhibitSurrogateCharactersValidator)]
        self.validators.append(_valid_utf8)


class NoteSerializer(serializers.ModelSerializer):
    """The signed-in user's own notes.

    `submit` is write-only: true -> status "submitted" (every field must be filled),
    false -> back to "draft". If omitted, the status is left as it is, and an
    already-submitted note must stay complete.
    """

    submit = serializers.BooleanField(write_only=True, required=False)
    policy_gaps = FastTextField(max_length=BOX_MAX, allow_blank=True, required=False)
    potential_solutions = FastTextField(max_length=BOX_MAX, allow_blank=True, required=False)
    best_practices = FastTextField(max_length=BOX_MAX, allow_blank=True, required=False)
    topic_title = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            "id", "topic", "topic_title", "status", "submit",
            "name", "designation", "batch", "service_status", "training_institute", "current_posting",
            "policy_gaps", "potential_solutions", "best_practices",
            "created_at", "updated_at", "submitted_at",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at", "submitted_at"]
        extra_kwargs = {
            "name": {"required": False},
        }

    def validate_batch(self, v):
        unchanged = self.instance is not None and v == self.instance.batch  # legacy rows may be saved as they are
        if v and v not in BATCH_YEARS and not unchanged:
            raise serializers.ValidationError("Choose your batch year (1992 to 2026).")
        return v

    def get_topic_title(self, obj):
        return TOPIC_TITLES.get(obj.topic, "")

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance is None:
            if Note.objects.filter(user=user).count() >= MAX_NOTES_PER_USER:
                raise serializers.ValidationError({"topic": [f"You can keep at most {MAX_NOTES_PER_USER} notes. Delete one you no longer need first."]})
        else:
            attrs.pop("topic", None)  # a note's topic never changes

        current = {f: attrs.get(f, getattr(self.instance, f, "")) for f in [*Note.REQUIRED_ON_SUBMIT]}
        if self.instance is None and not str(current.get("name", "")).strip():
            current["name"] = attrs["name"] = user.name

        submit = attrs.get("submit")
        wants_submitted = submit if submit is not None else bool(self.instance and self.instance.status == Note.SUBMITTED)
        if wants_submitted:
            errors = {
                f: [f"{label} is required to submit."]
                for f, label in Note.REQUIRED_ON_SUBMIT.items()
                if not str(current.get(f, "")).strip()
            }
            if errors:
                raise serializers.ValidationError(errors)
        attrs["_wants_submitted"] = wants_submitted
        return attrs

    def _apply_status(self, validated, instance=None):
        wants = validated.pop("_wants_submitted", False)
        validated.pop("submit", None)
        if wants:
            validated["status"] = Note.SUBMITTED
            if not instance or instance.status != Note.SUBMITTED:
                validated["submitted_at"] = timezone.now()
        else:
            validated["status"] = Note.DRAFT
            validated["submitted_at"] = None
        return validated

    def create(self, validated):
        validated = self._apply_status(validated)
        return Note.objects.create(user=self.context["request"].user, **validated)

    def update(self, instance, validated):
        validated = self._apply_status(validated, instance)
        if all(getattr(instance, k) == v for k, v in validated.items()):
            return instance  # autosave of an unchanged note: no database write
        return super().update(instance, validated)


class AdminNoteSerializer(NoteSerializer):
    """Read-only view of any note, with the author's account details."""

    user_id = serializers.IntegerField(read_only=True)
    user_email = serializers.EmailField(source="user.email", read_only=True)
    state_ut = serializers.CharField(source="user.state_ut", read_only=True)

    class Meta(NoteSerializer.Meta):
        fields = [*NoteSerializer.Meta.fields, "user_id", "user_email", "state_ut"]
        read_only_fields = fields
