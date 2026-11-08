import { useTranslation } from 'react-i18next'

import { formatMoneyWhole, formatPercent } from '../utils/format'
import styles from './CostOfLiving.module.css'

// Блок «Вартість життя» для одной страны.
// item — строка рейтинга бэкенда: { rank, year, price_level_index, avg_net_earnings_eur,
// purchasing_power_index, source, country }; total — сколько всего стран в рейтинге
function CostOfLiving({ item, total }) {
  const { t, i18n } = useTranslation()
  const language = i18n.language
  const name = t(`countries.${item.country.code}`)

  return (
    <aside className={styles.box} aria-label={t('costOfLiving.title', { country: name })}>
      <h2 className={styles.title}>{t('costOfLiving.title', { country: name })}</h2>
      <dl className={styles.facts}>
        <div>
          <dt>{t('costOfLiving.prices')}</dt>
          <dd>{t('costOfLiving.pricesValue', { value: formatPercent(item.price_level_index, language) })}</dd>
        </div>
        <div>
          <dt>{t('costOfLiving.averageNet')}</dt>
          <dd>
            {t('costOfLiving.perMonth', { amount: formatMoneyWhole(item.avg_net_earnings_eur / 12, language) })}
          </dd>
        </div>
        <div>
          <dt>{t('costOfLiving.power')}</dt>
          <dd>
            {t('costOfLiving.powerValue', {
              value: Math.round(item.purchasing_power_index),
              rank: item.rank,
              total,
            })}
          </dd>
        </div>
      </dl>
      <p className={styles.source}>{t('costOfLiving.source', { year: item.year })}</p>
    </aside>
  )
}

export default CostOfLiving
