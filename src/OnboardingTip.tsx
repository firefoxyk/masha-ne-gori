import type { TipId } from './game/onboarding'

const tips: Record<TipId, { title: string; text: string }> = {
  intro: { title: 'Знакомьтесь: Маша', text: 'Маша работает, мечтает и иногда забывает поесть. Помогите ей прожить день: выбирайте работу, еду или отдых в любом порядке.' },
  projects: { title: 'Идеи Маши', text: 'В «Проектах Маши» можно выбрать идею и постепенно воплотить её.' },
  shop: { title: 'Немного уюта', text: 'После дня можно заглянуть в магазин и купить что-нибудь для Маши и комнаты.' },
  queue: { title: 'История подождёт', text: 'Кнопка «Есть история» откроет ожидающий рассказ, когда вам будет удобно.' },
}

export default function OnboardingTip({ id, onDismiss }: { id: TipId; onDismiss: (id: TipId) => void }) {
  const tip = tips[id]
  return <aside className="onboarding-tip" aria-label={tip.title}>
    <p><strong>{tip.title}.</strong> {tip.text}</p>
    <button type="button" onClick={() => onDismiss(id)} aria-label={`Закрыть подсказку: ${tip.title}`}>Понятно</button>
  </aside>
}
