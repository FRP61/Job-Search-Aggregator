"""Industry catalogue: the single source of truth for slugs, provider category mapping
and keyword-based classification.

Keywords match at word boundaries. A trailing ``*`` turns a keyword into a stem
(``entwickl*`` matches "Entwickler", "Entwicklung"), which is how inflected
German/Polish/Ukrainian words are covered.
"""

from dataclasses import dataclass, field


@dataclass(frozen=True)
class IndustryDef:
    slug: str
    name_en: str
    name_uk: str
    adzuna_tag: str | None
    keywords: tuple[str, ...] = field(default_factory=tuple)


INDUSTRIES: tuple[IndustryDef, ...] = (
    IndustryDef(
        "it", "IT & Software", "IT та розробка", "it-jobs",
        (
            "developer", "software", "programmer", "devops", "sre", "data scientist", "data engineer",
            "data analyst", "machine learning", "frontend", "front-end", "backend", "back-end",
            "fullstack", "full-stack", "full stack", "python", "java", "javascript", "typescript",
            "golang", "php", "react", "qa engineer", "test engineer", "tester", "sysadmin",
            "system administrator", "cloud", "cyber security", "cybersecurity", "it support",
            "entwickl*", "informatik*", "programist*", "розроб*", "програміст*", "тестувальн*",
        ),
    ),
    IndustryDef(
        "engineering", "Engineering", "Інженерія", "engineering-jobs",
        (
            "mechanical engineer", "electrical engineer", "civil engineer", "process engineer",
            "design engineer", "maintenance engineer", "engineer", "ingenieur*", "inżynier*",
            "інженер*", "konstrukteur*",
        ),
    ),
    IndustryDef(
        "finance", "Finance & Accounting", "Фінанси та бухгалтерія", "accounting-finance-jobs",
        (
            "accountant", "accounting", "finance", "financial", "controller", "controlling", "auditor",
            "audit", "bookkeeper", "payroll", "tax advisor", "buchhalt*", "steuer*", "księgow*",
            "бухгалтер*", "фінанс*", "аудитор*",
        ),
    ),
    IndustryDef(
        "healthcare", "Healthcare", "Медицина та фармацевтика", "healthcare-nursing-jobs",
        (
            "nurse", "nursing", "doctor", "physician", "pharmacist", "dentist", "caregiver", "carer",
            "physiotherapist", "medical", "pfleg*", "arzt", "ärzt*", "pielęgniar*", "lekarz*",
            "лікар*", "медсестр*", "фармацевт*",
        ),
    ),
    IndustryDef(
        "sales", "Sales", "Продажі", "sales-jobs",
        (
            "sales", "account executive", "account manager", "business development", "key account",
            "vertrieb*", "verkauf*", "sprzeda*", "продаж*",
        ),
    ),
    IndustryDef(
        "marketing", "Marketing & PR", "Маркетинг і PR", "pr-advertising-marketing-jobs",
        (
            "marketing", "seo", "sem", "content manager", "copywriter", "social media", "pr",
            "public relations", "brand manager", "smm", "маркетолог*", "маркетинг*",
        ),
    ),
    IndustryDef(
        "education", "Education", "Освіта", "teaching-jobs",
        (
            "teacher", "teaching", "tutor", "lecturer", "professor", "educator", "lehrer*",
            "erzieher*", "nauczyciel*", "вчител*", "викладач*", "вихователь*",
        ),
    ),
    IndustryDef(
        "hospitality", "Hospitality & Catering", "Готельно-ресторанна справа", "hospitality-catering-jobs",
        (
            "chef", "cook", "waiter", "waitress", "barista", "bartender", "housekeeping", "hotel",
            "restaurant", "kitchen", "koch", "köch*", "kellner*", "kelner*", "kucharz*", "кухар*",
            "офіціант*", "бармен*",
        ),
    ),
    IndustryDef(
        "logistics", "Logistics & Warehouse", "Логістика та склад", "logistics-warehouse-jobs",
        (
            "driver", "warehouse", "logistics", "forklift", "courier", "delivery", "supply chain",
            "dispatcher", "lager*", "fahrer*", "kierowc*", "magazyn*", "водій*", "водія", "склад*",
            "логіст*", "кур'єр*",
        ),
    ),
    IndustryDef(
        "construction", "Construction & Trades", "Будівництво та робітничі професії", "trade-construction-jobs",
        (
            "construction", "electrician", "plumber", "carpenter", "welder", "bricklayer", "roofer",
            "painter", "site manager", "bau*", "elektriker*", "schweiß*", "budow*", "elektryk*",
            "spawacz*", "будів*", "електрик*", "зварювальн*", "сантехнік*",
        ),
    ),
    IndustryDef(
        "manufacturing", "Manufacturing", "Виробництво", "manufacturing-jobs",
        (
            "production", "manufacturing", "machine operator", "assembly", "cnc", "factory",
            "produktion*", "produkcj*", "виробни*", "оператор*",
        ),
    ),
    IndustryDef(
        "customer-service", "Customer Service", "Обслуговування клієнтів", "customer-services-jobs",
        (
            "customer service", "customer support", "customer success", "call center", "call centre",
            "help desk", "kundenservice", "kundenbetreuung", "obsługa klienta", "підтримк*",
            "оператор кол-центру",
        ),
    ),
    IndustryDef(
        "admin", "Administration & Office", "Адміністрування та офіс", "admin-jobs",
        (
            "administrative", "administrator", "office manager", "office assistant", "receptionist",
            "secretary", "assistant", "data entry", "sachbearbeit*", "büro*", "sekretar*",
            "адміністратор*", "офіс-менеджер*", "секретар*",
        ),
    ),
    IndustryDef(
        "hr", "Human Resources", "HR та рекрутинг", "hr-jobs",
        (
            "hr", "human resources", "recruiter", "recruiting", "recruitment", "talent acquisition",
            "people partner", "personalreferent*", "rekrut*", "рекрутер*", "кадр*",
        ),
    ),
    IndustryDef(
        "legal", "Legal", "Юриспруденція", "legal-jobs",
        (
            "lawyer", "legal", "paralegal", "attorney", "solicitor", "compliance", "jurist*",
            "rechtsanw*", "prawnik*", "юрист*", "адвокат*",
        ),
    ),
    IndustryDef(
        "design", "Design & Creative", "Дизайн і креатив", "creative-design-jobs",
        (
            "designer", "ux", "ui", "graphic", "illustrator", "art director", "motion", "video editor",
            "photographer", "designer*", "grafik*", "дизайнер*",
        ),
    ),
    IndustryDef(
        "science", "Science & Research", "Наука та дослідження", "scientific-qa-jobs",
        (
            "scientist", "researcher", "research", "laboratory", "lab technician", "chemist",
            "biologist", "quality assurance", "wissenschaft*", "labor*", "naukow*", "науков*",
            "лаборант*", "дослідн*",
        ),
    ),
    IndustryDef(
        "retail", "Retail", "Роздрібна торгівля", "retail-jobs",
        (
            "retail", "store manager", "shop assistant", "cashier", "sales associate", "merchandiser",
            "verkäufer*", "kassier*", "kasjer*", "продав*", "касир*", "мерчендайзер*",
        ),
    ),
    IndustryDef("other", "Other", "Інше", "other-general-jobs", ()),
)

INDUSTRY_BY_SLUG = {industry.slug: industry for industry in INDUSTRIES}
INDUSTRY_BY_ADZUNA_TAG = {i.adzuna_tag: i for i in INDUSTRIES if i.adzuna_tag}
