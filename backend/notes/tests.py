from django.core import mail
from django.core.cache import cache
from django.test import Client, TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import User
from notes.models import Note

PROFILE = dict(
    password="Str0ng-Pass!9", name="Asha Rao", designation="Collector", batch="2015",
    service_status="Confirmed", current_posting="Goa Secretariat", state_ut="Goa", training_institute="",
)
BODY = dict(
    name="Asha Rao", designation="Collector", batch="2015", service_status="Confirmed",
    current_posting="Goa Secretariat", policy_gaps="Gaps see https://data.gov.in/x.", potential_solutions="Sol", best_practices="Best",
)


def make_user(email="asha@x.in", **kw):
    data = {**PROFILE, **kw}
    return User.objects.create_user(email=email, **data)


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])  # fast tests
class Base(TestCase):
    def setUp(self):
        cache.clear()  # reset throttles
        self.c = APIClient()

    def login(self, user):
        self.c.force_authenticate(user)  # for /api/ (DRF)
        self.c.force_login(user)  # for /print/ (Django session)

    def logout(self):
        self.c.force_authenticate(None)
        self.c.logout()


class AuthTests(Base):
    def test_signup_logs_in_and_validates(self):
        r = self.c.post("/api/auth/signup/", {**PROFILE, "email": "New@X.in"}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["email"], "new@x.in")
        self.assertEqual(self.c.get("/api/auth/me/").status_code, 200)

    def test_signup_rejects_duplicate_email_weak_password_and_bad_state(self):
        make_user()
        for patch, field in [({"email": "ASHA@x.in"}, "email"), ({"password": "12345678"}, "password"), ({"state_ut": "Atlantis"}, "state_ut")]:
            data = {**PROFILE, "email": "u2@x.in", **patch}
            r = APIClient().post("/api/auth/signup/", data, format="json")
            self.assertEqual(r.status_code, 400, (field, r.content))
            self.assertIn(field, r.json()["fields"])

    def test_login_and_wrong_password(self):
        make_user()
        self.assertEqual(self.c.post("/api/auth/login/", {"email": "asha@x.in", "password": "nope"}, format="json").status_code, 400)
        r = self.c.post("/api/auth/login/", {"email": "ASHA@x.in", "password": PROFILE["password"]}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertFalse(r.json()["is_admin"])

    def test_login_requires_csrf_token(self):
        make_user()
        strict = Client(enforce_csrf_checks=True)
        r = strict.post("/api/auth/login/", {"email": "asha@x.in", "password": PROFILE["password"]}, content_type="application/json")
        self.assertEqual(r.status_code, 403)

    def test_login_is_rate_limited(self):
        make_user()
        codes = [self.c.post("/api/auth/login/", {"email": "asha@x.in", "password": "bad"}, format="json").status_code for _ in range(25)]
        self.assertIn(429, codes)

    def test_anonymous_cannot_use_api(self):
        self.assertEqual(self.c.get("/api/notes/").status_code, 403)
        self.assertEqual(self.c.get("/api/admin/stats/").status_code, 403)

    def test_profile_update_and_password_change(self):
        u = make_user()
        self.login(u)
        self.assertEqual(self.c.patch("/api/auth/me/", {"current_posting": "Panaji"}, format="json").status_code, 200)
        u.refresh_from_db()
        self.assertEqual(u.current_posting, "Panaji")
        self.assertEqual(self.c.patch("/api/auth/me/", {"batch": ""}, format="json").status_code, 400)
        bad = self.c.post("/api/auth/password/", {"current_password": "x", "new_password": "An0ther-Pass!7"}, format="json")
        self.assertEqual(bad.status_code, 400)
        ok = self.c.post("/api/auth/password/", {"current_password": PROFILE["password"], "new_password": "An0ther-Pass!7"}, format="json")
        self.assertEqual(ok.status_code, 200)
        u.refresh_from_db()
        self.assertTrue(u.check_password("An0ther-Pass!7"))


class NoteTests(Base):
    def setUp(self):
        super().setUp()
        self.user = make_user()
        self.login(self.user)

    def post(self, topic, **extra):
        return self.c.post("/api/notes/", {**BODY, "topic": topic, **extra}, format="json")

    def test_one_person_can_file_up_to_three_notes_in_different_topics(self):
        for t in ("data", "geo", "micro"):
            r = self.post(t, submit=True)
            self.assertEqual(r.status_code, 201, r.content)
            self.assertEqual(r.json()["status"], "submitted")
        self.assertEqual(Note.objects.filter(user=self.user).count(), 3)
        self.assertEqual(len(self.c.get("/api/notes/").json()), 3)

    def test_same_topic_twice_is_rejected(self):
        self.assertEqual(self.post("data").status_code, 201)
        r = self.post("data")
        self.assertEqual(r.status_code, 400)
        self.assertIn("topic", r.json()["fields"])

    def test_invalid_topic_rejected(self):
        self.assertEqual(self.post("space").status_code, 400)

    def test_database_enforces_one_note_per_topic(self):
        from django.db import IntegrityError, transaction

        Note.objects.create(user=self.user, topic="data", name="A")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Note.objects.create(user=self.user, topic="data", name="B")

    def test_draft_may_be_partial_but_submit_must_be_complete(self):
        r = self.c.post("/api/notes/", {"topic": "data", "name": "Asha"}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()["status"], "draft")
        nid = r.json()["id"]
        bad = self.c.patch(f"/api/notes/{nid}/", {"submit": True}, format="json")
        self.assertEqual(bad.status_code, 400)
        self.assertIn("policy_gaps", bad.json()["fields"])
        ok = self.c.patch(f"/api/notes/{nid}/", {**BODY, "submit": True}, format="json")
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(ok.json()["status"], "submitted")
        self.assertIsNotNone(ok.json()["submitted_at"])

    def test_submitted_note_cannot_be_emptied_without_reverting_to_draft(self):
        nid = self.post("data", submit=True).json()["id"]
        self.assertEqual(self.c.patch(f"/api/notes/{nid}/", {"policy_gaps": ""}, format="json").status_code, 400)
        r = self.c.patch(f"/api/notes/{nid}/", {"policy_gaps": "", "submit": False}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()["status"], "draft")

    def test_topic_cannot_be_changed(self):
        nid = self.post("data").json()["id"]
        r = self.c.patch(f"/api/notes/{nid}/", {"topic": "geo"}, format="json")
        self.assertEqual(r.json()["topic"], "data")

    def test_users_cannot_touch_each_others_notes(self):
        nid = self.post("data").json()["id"]
        other = make_user("bala@x.in", name="Bala")
        self.login(other)
        self.assertEqual(self.c.get(f"/api/notes/{nid}/").status_code, 404)
        self.assertEqual(self.c.delete(f"/api/notes/{nid}/").status_code, 404)
        self.assertEqual(self.c.get("/api/notes/").json(), [])

    def test_delete_frees_the_slot(self):
        nid = self.post("data").json()["id"]
        self.assertEqual(self.c.delete(f"/api/notes/{nid}/").status_code, 204)
        self.assertEqual(self.post("data").status_code, 201)

    def test_ordinary_user_cannot_use_admin_api(self):
        for url in ("/api/admin/stats/", "/api/admin/notes/", "/api/admin/users/", "/api/admin/notes/export.csv"):
            self.assertEqual(self.c.get(url).status_code, 403, url)


class AdminAndPrintTests(Base):
    def setUp(self):
        super().setUp()
        self.admin = User.objects.create_superuser("admin@x.in", "Adm1n-Pass!9")
        self.asha = make_user()
        self.bala = make_user("bala@x.in", name="Bala Iyer", service_status="Probationer", current_posting="LBSNAA")
        self.zed = make_user("zed@x.in", name="Zed", state_ut="Kerala")
        for u in (self.asha, self.bala, self.zed):
            for t in ("data", "geo"):
                Note.objects.create(user=u, topic=t, status="submitted", **{**BODY, "name": u.name, "service_status": u.service_status, "current_posting": u.current_posting})
        Note.objects.create(user=self.asha, topic="micro", status="draft", name="Asha Rao")

    def test_stats(self):
        self.login(self.admin)
        s = self.c.get("/api/admin/stats/").json()
        self.assertEqual((s["users"], s["submitted"], s["draft"], s["contributors"]), (3, 6, 1, 3))
        data = next(t for t in s["by_topic"] if t["key"] == "data")
        self.assertEqual(data["submitted"], 3)

    def test_notes_filtering_and_pagination(self):
        self.login(self.admin)
        r = self.c.get("/api/admin/notes/?topic=data&state=Goa&status=submitted").json()
        self.assertEqual(r["count"], 2)
        self.assertEqual([n["name"] for n in r["results"]], ["Asha Rao", "Bala Iyer"])
        self.assertEqual(self.c.get("/api/admin/notes/?q=lbsnaa").json()["count"], 2)
        self.assertEqual(len(self.c.get("/api/admin/notes/?page_size=2").json()["results"]), 2)

    def test_users_list(self):
        self.login(self.admin)
        res = {u["email"]: u for u in self.c.get("/api/admin/users/").json()["results"]}
        self.assertEqual(res["asha@x.in"]["notes_total"], 3)
        self.assertEqual(res["asha@x.in"]["notes_submitted"], 2)

    def test_csv_export_neutralises_formulas(self):
        Note.objects.filter(user=self.zed, topic="geo").update(policy_gaps="=HYPERLINK(\"http://evil\")")
        self.login(self.admin)
        r = self.c.get("/api/admin/notes/export.csv?topic=geo")
        body = r.content.decode("utf-8-sig")
        self.assertIn("text/csv", r["Content-Type"])
        self.assertIn("Asha Rao", body)
        self.assertNotIn(",=HYPERLINK", body)
        self.assertIn("'=HYPERLINK", body)

    def test_print_single_owner_admin_and_stranger(self):
        n = Note.objects.get(user=self.asha, topic="data")
        self.login(self.asha)
        r = self.c.get(f"/print/notes/{n.pk}/")
        self.assertEqual(r.status_code, 200)
        html = r.content.decode()
        for expected in ("Sixth National Conference of Chief Secretaries", "Section 1", "Name : Asha Rao",
                         "1. Name of the topic", "2. Policy Gaps and Challenges", "3. Potential Solutions",
                         "4. Best Practices", "Instructions for filing feedback note:",
                         'href="https://data.gov.in/x"', "Data Governance, Government Data for AI"):
            self.assertIn(expected, html)
        self.login(self.bala)
        self.assertEqual(self.c.get(f"/print/notes/{n.pk}/").status_code, 404)
        self.login(self.admin)
        self.assertEqual(self.c.get(f"/print/notes/{n.pk}/").status_code, 200)

    def test_print_escapes_user_html(self):
        n = Note.objects.get(user=self.asha, topic="data")
        n.policy_gaps = "<script>alert(1)</script> & <b>x</b>"
        n.save()
        self.login(self.admin)
        html = self.c.get(f"/print/notes/{n.pk}/").content.decode()
        self.assertNotIn("<script>alert(1)", html)
        self.assertIn("&lt;script&gt;alert(1)&lt;/script&gt;", html)

    def test_compiled_print_has_summary_first_then_alphabetical_per_state(self):
        self.login(self.admin)
        html = self.c.get("/print/?topic=data&summary=1").content.decode()
        self.assertEqual(html.count("Summary of Feedback Notes:"), 2)  # Goa and Kerala
        goa, kerala = html.index("Name of State/ UT:</b> Goa"), html.index("Name of State/ UT:</b> Kerala")
        self.assertLess(goa, kerala)
        goa_part = html[goa:kerala]
        self.assertLess(goa_part.index("Name : Asha Rao"), goa_part.index("Name : Bala Iyer"))
        self.assertIn("No. of probationers who have written feedback note on this topic:</b> 1", goa_part)

    def test_compiled_print_excludes_drafts_and_can_drop_instructions(self):
        self.login(self.admin)
        self.assertEqual(self.c.get("/print/?topic=micro").status_code, 404)  # only a draft exists
        self.assertNotIn("Instructions for filing", self.c.get("/print/?topic=data&noinstr=1").content.decode())

    def test_print_many_is_admin_only(self):
        self.login(self.asha)
        self.assertEqual(self.c.get("/print/?topic=data").status_code, 403)
        self.logout()
        self.assertEqual(self.c.get("/print/?topic=data").status_code, 403)
        self.login(self.admin)
        self.assertEqual(self.c.get("/print/").status_code, 400)


class PasswordResetTests(Base):
    def setUp(self):
        super().setUp()
        self.user = make_user()

    def request_reset(self, email="asha@x.in"):
        with self.settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend"):
            from unittest import mock

            # run the "background" send synchronously so the test can read the outbox
            with mock.patch("accounts.views.send_password_reset_email", side_effect=lambda r, u: __import__("accounts.emails", fromlist=["x"]).send_password_reset_email(r, u, background=False)):
                return self.c.post("/api/auth/password-reset/", {"email": email}, format="json")

    def token_from_mail(self):
        import re

        body = mail.outbox[-1].body
        return re.search(r"/reset-password/([^/\s]+)/([^/\s]+)", body).groups()

    def test_unknown_and_known_emails_get_the_same_answer(self):
        a = self.request_reset("nobody@x.in")
        n_after_unknown = len(mail.outbox)
        b = self.request_reset("ASHA@x.in")
        self.assertEqual((a.status_code, a.json()), (b.status_code, b.json()))
        self.assertEqual(n_after_unknown, 0)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["asha@x.in"])

    def test_inactive_user_gets_no_mail(self):
        User.objects.filter(pk=self.user.pk).update(is_active=False)
        self.assertEqual(self.request_reset().status_code, 200)
        self.assertEqual(len(mail.outbox), 0)

    def test_email_contains_working_link_and_html_part(self):
        self.request_reset()
        msg = mail.outbox[0]
        self.assertIn("Reset your password", msg.subject)
        self.assertTrue(msg.alternatives and "Set a new password" in msg.alternatives[0][0])
        uid, token = self.token_from_mail()
        r = self.c.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "Brand-New-Pass!8"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Brand-New-Pass!8"))
        # a link works once
        again = self.c.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "Another-Pass!77"}, format="json")
        self.assertEqual(again.status_code, 400)
        self.assertIn("invalid or has expired", again.json()["detail"])

    def test_bad_token_and_weak_password_are_rejected(self):
        self.request_reset()
        uid, token = self.token_from_mail()
        bad = self.c.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": "x" * 20, "new_password": "Brand-New-Pass!8"}, format="json")
        self.assertEqual(bad.status_code, 400)
        weak = self.c.post("/api/auth/password-reset/confirm/", {"uid": uid, "token": token, "new_password": "12345678"}, format="json")
        self.assertEqual(weak.status_code, 400)
        self.assertIn("new_password", weak.json()["fields"])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password(PROFILE["password"]))  # unchanged

    def test_site_url_setting_is_used_in_links(self):
        with self.settings(SITE_URL="https://feedback.example.gov.in"):
            self.request_reset()
        self.assertIn("https://feedback.example.gov.in/reset-password/", mail.outbox[0].body)

    def test_reset_requires_csrf(self):
        strict = Client(enforce_csrf_checks=True)
        r = strict.post("/api/auth/password-reset/", {"email": "asha@x.in"}, content_type="application/json")
        self.assertEqual(r.status_code, 403)
