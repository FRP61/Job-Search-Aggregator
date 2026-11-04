"""EURES, the EU job portal: public employment services of all 27 member states."""

from app.integrations.base import fill_computed_fields, NormalizedVacancy

EURES_JOB_URL = "https://europa.eu/eures/portal/jv-se/jv-details/{job_id}?lang=en"


def parse_eures_job(job: dict, country_code: str):
    """Turn one job from an EURES search response into a NormalizedVacancy.

    The search response has no city and no salary. We ask EURES one country
    at a time, so the country comes from the request, not from the job.
    """

    company = None
    employer = job.get("employer")
    if employer is not None:
        company = employer.get("name")

    vacancy = NormalizedVacancy(
        source="eures",
        external_id=job["id"],
        title=job["title"],
        url=EURES_JOB_URL.format(job_id=job["id"]),
        country_code=country_code,
        company=company,
        description=job.get("description"),
    )

    return fill_computed_fields(vacancy)


def parse_eures_response(data: dict, country_code: str):
    """Turn an EURES search response into a list of NormalizedVacancy."""
    vacancies = []
    for job in data.get("jvs", []):
        try:
            vacancy = parse_eures_job(job, country_code)
        except KeyError:
            continue
        vacancies.append(vacancy)
    return vacancies

def eures_location_code(country_code: str):
    if country_code == "GR":
        return "el"

    return country_code.lower()

def build_eures_search_body(country_code: str, page: int):
    return {
    "resultsPerPage": 50,
    "page": page,
    "sortSearch": "MOST_RECENT",
    "keywords": [],
    "locationCodes": [eures_location_code(country_code)],
    "positionScheduleCodes": [],
    "positionOfferingCodes": [],
    "offeringCodes": [],
    "educationAndQualificationLevelCodes": [],
    "occupationUris": [],
    "sectorCodes": [],
    "publicationPeriod": None,
    "euresFlagCodes": [],
    "otherBenefitsCodes": [],
    "requiredExperienceCodes": [],
    "requiredLanguages": [],
    "minNumberPost": None,
    "sessionId": "x",
    }

