from app.integrations.eures import parse_eures_response

DATE = 1793622360191
JOB_A = {"id": "a", "title": "Python Developer", "creationDate": DATE, "employer": {"name": "Bosch"}}
JOB_B = {"id": "b", "title": "Koch", "creationDate": DATE}
JOB_WITHOUT_TITLE = {"id": "broken", "creationDate": DATE}
JOB_WITHOUT_DATE = {"id": "no-date", "title": "Koch"}
JOB_WITH_EMPTY_DATE = {"id": "empty-date", "title": "Koch", "creationDate": None}


def test_every_job_becomes_a_vacancy_in_the_same_order():
    vacancies = parse_eures_response({"numberRecords": 2, "jvs": [JOB_A, JOB_B]}, "DE")
    assert [v.external_id for v in vacancies] == ["a", "b"]


def test_country_is_passed_to_every_vacancy():
    vacancies = parse_eures_response({"jvs": [JOB_A, JOB_B]}, "PL")
    assert [v.country_code for v in vacancies] == ["PL", "PL"]


def test_vacancies_are_complete():
    vacancy = parse_eures_response({"jvs": [JOB_A]}, "DE")[0]
    assert vacancy.company == "Bosch"
    assert vacancy.industry == "it"
    assert len(vacancy.fingerprint) == 40


def test_empty_results_give_empty_list():
    assert parse_eures_response({"numberRecords": 0, "jvs": []}, "DE") == []


def test_response_without_jobs_key_gives_empty_list():
    assert parse_eures_response({"numberRecords": 0}, "DE") == []


def test_broken_job_is_skipped_and_the_rest_are_kept():
    vacancies = parse_eures_response({"jvs": [JOB_A, JOB_WITHOUT_TITLE, JOB_B]}, "DE")
    assert [v.external_id for v in vacancies] == ["a", "b"]


def test_jobs_without_a_date_are_skipped():
    data = {"jvs": [JOB_A, JOB_WITHOUT_DATE, JOB_WITH_EMPTY_DATE, JOB_B]}
    vacancies = parse_eures_response(data, "DE")
    assert [v.external_id for v in vacancies] == ["a", "b"]
