from django.conf import settings
from django.db import models

from core.constants import SERVICE_STATUSES, TOPIC_TITLES, TOPICS


class Note(models.Model):
    """A Feedback Note (Template 1). A person may file several notes, including more than one on the same topic."""

    TOPIC_CHOICES = TOPICS
    DRAFT, SUBMITTED = "draft", "submitted"
    STATUS_CHOICES = [(DRAFT, "Draft"), (SUBMITTED, "Submitted")]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notes")
    topic = models.CharField(max_length=10, choices=TOPIC_CHOICES)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=DRAFT, db_index=True)

    # Section 1: Officer Name and Details (snapshot - may differ from the profile at the time of writing)
    name = models.CharField(max_length=150)
    designation = models.CharField(max_length=200, blank=True)
    batch = models.CharField(max_length=100, blank=True)
    service_status = models.CharField(max_length=20, blank=True, choices=[(s, s) for s in SERVICE_STATUSES])
    training_institute = models.CharField(max_length=250, blank=True)
    current_posting = models.CharField(max_length=300, blank=True)

    # Section 2: Feedback
    policy_gaps = models.TextField("2. Policy Gaps and Challenges", blank=True)
    potential_solutions = models.TextField("3. Potential Solutions", blank=True)
    best_practices = models.TextField("4. Best Practices", blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["name", "topic", "id"]
        indexes = [models.Index(fields=["topic", "status"]), models.Index(fields=["user", "topic"])]

    # Fields that must be filled before a note can be submitted (drafts may be partial).
    REQUIRED_ON_SUBMIT = {
        "name": "Name",
        "designation": "Designation",
        "batch": "Batch",
        "service_status": "Current service status",
        "current_posting": "Current Posting",
        "policy_gaps": "Policy Gaps and Challenges",
        "potential_solutions": "Potential Solutions",
        "best_practices": "Best Practices",
    }

    @property
    def topic_title(self):
        return TOPIC_TITLES.get(self.topic, "")

    def __str__(self):
        return f"{self.name} - {self.topic_title} ({self.status})"
