"""Static reference data taken from "Template 1-Feedback-Note_6th CS_F.docx"."""

MAX_NOTES_PER_USER = 3  # one note in each subject area

# (key, title) - titles are verbatim from the template.
TOPICS = [
    ("data", "Data Governance, Government Data for AI and Practical AI Adoption"),
    ("geo", "Geospatial Technologies for Governance"),
    ("micro", "Microbiome Technologies for Governance"),
]
TOPIC_TITLES = dict(TOPICS)

PROBATIONER = "Probationer"
CONFIRMED = "Confirmed"
SERVICE_STATUSES = [PROBATIONER, CONFIRMED]

DEFAULT_SERVICE_STATUS = CONFIRMED
DEFAULT_STATE_UT = "Kerala"

OTHER_STATE = "Government of India / National Institute"
STATES_UTS = [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
    "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
    "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan",
    "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
    OTHER_STATE,
]
