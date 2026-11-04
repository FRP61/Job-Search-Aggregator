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
            "*entwickler*", "*informatiker*", "*programmierer*", "it-*", "erp", "erp-*", "anwendungsberater*", "*systemadministrator*",
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
            "*buchhalt*", "bankkauf*", "kreditsachbearbeit*", "versicherung*", "versicherungskauf*", "krankenversicherung*",
        ),
    ),
    IndustryDef(
        "healthcare", "Healthcare", "Медицина та фармацевтика", "healthcare-nursing-jobs",
        (
            "nurse", "nursing", "doctor", "physician", "pharmacist", "dentist", "caregiver", "carer",
            "physiotherapist", "medical", "pfleg*", "arzt", "ärzt*", "pielęgniar*", "lekarz*",
            "лікар*", "медсестр*", "фармацевт*",
            "altenpfleg*", "krankenpfleg*", "heilerziehungspfleg*", "gesundheitspfleg*", "medizinische*", "zahnmedizin*", "physiotherap*", "*therapeut*", "arzthelf*",
        ),
    ),
    IndustryDef(
        "sales", "Sales", "Продажі", "sales-jobs",
        (
            "sales", "account executive", "account manager", "business development", "key account",
            "vertrieb*", "verkauf*", "sprzeda*", "продаж*",
            "*verkäufer*", "*kundenberater*", "bezirksleit*",
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
            "*lagerist*", "*kraftfahrer*", "*staplerfahrer*", "lkw*", "*spedition*", "*kommissionier*", "*logistik*", "warenannehm*",
        ),
    ),
    IndustryDef(
        "construction", "Construction & Trades", "Будівництво та робітничі професії", "trade-construction-jobs",
        (
            "construction", "electrician", "plumber", "carpenter", "welder", "bricklayer", "roofer",
            "painter", "site manager", "bau*", "elektriker*", "schweiß*", "budow*", "elektryk*",
            "spawacz*", "будів*", "електрик*", "зварювальн*", "сантехнік*",
            "anlagenmechaniker*", "*elektriker*", "*elektroinstallateur*",
        ),
    ),
    IndustryDef(
        "manufacturing", "Manufacturing", "Виробництво", "manufacturing-jobs",
        (
            "production", "manufacturing", "machine operator", "assembly", "cnc", "factory",
            "produktion*", "produkcj*", "виробни*", "оператор*",
            "*mechaniker*", "*mechatroniker*", "*anlagenführer*", "*maschinenführer*", "*zerspanung*", "cnc*", "cnc-*", "lackierer*", "*schlosser*", "*elektroniker*", "instandhaltung*",
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
            "sachbearbeit*", "managementassistent*", "verwaltungsfach*", "industriekauf*", "bürokauf*",
        ),
    ),
    IndustryDef(
        "hr", "Human Resources", "HR та рекрутинг", "hr-jobs",
        (
            "hr", "human resources", "recruiter", "recruiting", "recruitment", "talent acquisition",
            "people partner", "personalreferent*", "rekrut*", "рекрутер*", "кадр*",
            "personalsachbearbeit*", "personalreferent*", "personalberater*",
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
            "*einzelhandel*",
        ),
    ),
    IndustryDef("other", "Other", "Інше", "other-general-jobs", ()),
)

INDUSTRY_BY_SLUG = {industry.slug: industry for industry in INDUSTRIES}
INDUSTRY_BY_ADZUNA_TAG = {i.adzuna_tag: i for i in INDUSTRIES if i.adzuna_tag}

# ISCO-08 occupation code prefix -> industry slug. The longest matching prefix wins.
# ISCO describes the job, not the employer: a secretary in a hospital is "admin".
# Prefixes not listed (farming, cleaning, security...) have no industry here.
ISCO_TO_INDUSTRY: dict[str, str] = {
    # Managers
    "1211": "finance", "1212": "hr", "1219": "admin", "1213": "admin", "1221": "sales", "1222": "marketing",
    "1223": "science", "1321": "manufacturing", "1322": "manufacturing", "1323": "construction",
    "1324": "logistics", "133": "it", "1342": "healthcare", "1343": "healthcare", "1345": "education",
    "141": "hospitality", "142": "retail",
    # Professionals
    "211": "science", "212": "science", "213": "science", "214": "engineering", "215": "engineering",
    "2161": "engineering", "2162": "engineering", "2163": "design", "2164": "engineering",
    "2165": "engineering", "2166": "design", "22": "healthcare", "23": "education", "241": "finance",
    "2421": "admin", "2422": "admin", "2423": "hr", "2424": "hr", "2431": "marketing", "2432": "marketing",
    "2433": "sales", "2434": "sales", "25": "it", "261": "legal", "264": "marketing", "265": "design",
    # Technicians and associate professionals
    "311": "engineering", "3121": "construction", "3122": "manufacturing", "3123": "construction",
    "313": "manufacturing", "314": "science", "315": "logistics", "32": "healthcare", "331": "finance",
    "332": "sales", "3331": "logistics", "3333": "hr", "3334": "sales", "3339": "sales", "334": "admin",
    "335": "admin", "341": "legal", "3434": "hospitality", "35": "it",
    # Office and customer service
    "41": "admin", "42": "customer-service", "431": "finance", "432": "logistics", "44": "admin",
    # Service and sales
    "511": "hospitality", "512": "hospitality", "513": "hospitality", "5151": "hospitality",
    "52": "retail", "5244": "customer-service", "531": "education", "532": "healthcare",
    # Trades, machine operators and drivers
    "71": "construction", "72": "manufacturing", "73": "manufacturing", "741": "construction",
    "742": "manufacturing", "75": "manufacturing", "81": "manufacturing", "82": "manufacturing",
    "83": "logistics",
    # Elementary occupations
    "931": "construction", "932": "manufacturing", "933": "logistics", "94": "hospitality",
}
