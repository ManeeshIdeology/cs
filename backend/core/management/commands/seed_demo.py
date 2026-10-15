"""Create demo officers and notes for trying out the portal. Never run this in production."""
from django.core.management.base import BaseCommand

from accounts.models import User
from notes.models import Note

OFFICERS = [
    ("Asha Rao", "asha.rao@example.com", "Collector", "2015", "Confirmed", "Goa Secretariat", "Goa"),
    ("Bala Iyer", "bala.iyer@example.com", "Assistant Secretary", "2024", "Probationer", "LBSNAA, Mussoorie", "Goa"),
    ("Chitra Menon", "chitra.menon@example.com", "Secretary, IT", "2009", "Confirmed", "Thiruvananthapuram", "Kerala"),
    ("Dev Malhotra", "dev.malhotra@example.com", "District Magistrate", "2017", "Confirmed", "Lucknow", "Uttar Pradesh"),
    ("Esha Singh", "esha.singh@example.com", "Sub-Divisional Magistrate", "2023", "Probationer", "Academy, Hyderabad", "Telangana"),
]
TEXT = {
    "policy_gaps": "Fragmented departmental datasets, limited interoperability and uneven capacity at block level.\nSee https://data.gov.in for the open data policy context.",
    "potential_solutions": "A State data exchange with common standards; convergence with existing digital schemes; training for frontline staff.",
    "best_practices": "District dashboards reviewed monthly by the Collector; replicable at block level with minimal cost.",
}


class Command(BaseCommand):
    help = "Seed demo officers and notes (password for all: Demo-Pass-123)."

    def handle(self, *args, **opts):
        topics = ["data", "geo", "micro"]
        for i, (name, email, desig, batch, status, posting, state) in enumerate(OFFICERS):
            u, created = User.objects.get_or_create(
                email=email,
                defaults=dict(name=name, designation=desig, batch=batch, service_status=status, current_posting=posting, state_ut=state,
                              training_institute="LBSNAA" if status == "Probationer" else ""),
            )
            if created:
                u.set_password("Demo-Pass-123")
                u.save()
            for j, t in enumerate(topics[: 3 - (i % 3)]):
                Note.objects.get_or_create(
                    user=u, topic=t,
                    defaults=dict(name=name, designation=desig, batch=batch, service_status=status, current_posting=posting,
                                  status="submitted" if (i + j) % 3 else "draft", **TEXT),
                )
        self.stdout.write(self.style.SUCCESS("Demo data ready."))
