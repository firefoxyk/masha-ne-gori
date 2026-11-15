import { useEffect, useRef, useState } from 'react'
import type { GameState } from './game/state'
import type { EventSession } from './game/eventSession'
import { parseSaveFile, SAVE_KEY, SAVE_VERSION, serializeGame } from './storage/gameStorage'
import type { LoadResult } from './storage/gameStorage'
import './projects.css'

type LoadedSave = Extract<LoadResult, { kind: 'loaded' }>
type Preview = { loaded: LoadedSave; expected: string | null; name: string }
type ImportResult = 'ok' | 'conflict' | 'unavailable' | 'uncertain'

function download(raw: string, prefix: string, extension: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: 'application/json;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.${extension}`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function SaveTransferDialog({ game, events, invalid, onClose, onImport }: { game: GameState; events: EventSession; invalid: boolean; onClose: () => void; onImport: (loaded: LoadedSave, expected: string | null) => ImportResult }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  const fileRequest = useRef(0)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => { const el = dialog.current; el?.showModal(); title.current?.focus(); return () => { if (el?.open) el.close() } }, [])

  async function chooseFile(file: File | undefined) {
    const request = ++fileRequest.current
    setPreview(null); setError(''); setNote('')
    if (!file) return
    try {
      const expected = window.localStorage.getItem(SAVE_KEY)
      const raw = await file.text()
      if (request !== fileRequest.current) return
      const loaded = parseSaveFile(raw)
      if (loaded.kind !== 'loaded') {
        let future = false
        try { const value: unknown = JSON.parse(raw); future = !!value && typeof value === 'object' && 'version' in value && typeof value.version === 'number' && value.version > SAVE_VERSION } catch { /* Некорректный JSON. */ }
        setError(future ? 'Файл создан более новой версией игры. Откройте его в более новой версии или выберите другой файл. Текущее сохранение не изменено.' : 'Файл повреждён или не подходит этой версии игры. Выберите другой файл. Текущее сохранение не изменено.')
        return
      }
      setPreview({ loaded, expected, name: file.name })
    } catch {
      if (request !== fileRequest.current) return
      setError('Не удалось прочитать файл или текущее сохранение. Текущие данные не изменены; проверьте доступ к файлу и хранилищу.')
    }
  }
  function exportSave() {
    setError(''); setNote('')
    try {
      if (invalid) {
        const raw = window.localStorage.getItem(SAVE_KEY)
        if (raw === null) throw new Error('missing')
        download(raw, 'masha-ne-gori-original', 'txt')
      } else download(serializeGame(game, events), 'masha-ne-gori-save', 'json')
      setNote('Браузеру передан файл для скачивания. Проверьте папку загрузок.')
    } catch { setError('Не удалось подготовить файл. Данные игры не изменены; проверьте доступ к хранилищу и загрузкам.') }
  }
  function confirmImport() {
    if (!preview) return
    const result = onImport(preview.loaded, preview.expected)
    if (result === 'ok') { onClose(); return }
    setPreview(null)
    setError(result === 'conflict' ? 'Сохранение изменилось после выбора файла. Импорт не подтверждён; проверьте последнюю версию и выберите файл заново.' : result === 'uncertain' ? 'Запись выполнена, но проверить её не удалось. Состояние хранилища неизвестно; обновите страницу после восстановления доступа.' : 'Не удалось записать файл в хранилище. Импорт не выполнен; прежние данные должны остаться на месте.')
  }

  return <dialog ref={dialog} className="projects-dialog save-transfer" aria-labelledby="transfer-title" onCancel={event => { event.preventDefault(); onClose() }}>
    <div className="projects-content">
      <h2 id="transfer-title" ref={title} tabIndex={-1}>Перенос сохранения</h2>
      <p>{invalid ? 'Исходные данные не удалось прочитать. Можно сохранить их как есть или выбрать файл для восстановления.' : 'Скачайте файл, чтобы перенести текущее прохождение на другое устройство. Данные не отправляются на сервер.'}</p>
      <button className="projects-close" type="button" onClick={exportSave}>{invalid ? 'Скачать исходные данные' : 'Скачать сохранение'}</button>
      <label className="save-file-label" htmlFor="save-file">Выбрать файл сохранения</label>
      <input id="save-file" type="file" accept=".json,application/json" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void chooseFile(file) }} />
      {note && <p role="status">{note}</p>}
      {error && <p role="alert">{error}</p>}
      {preview && <div className="save-preview" role="group" aria-label="Проверенное сохранение" aria-live="polite">
        <p>Файл: {preview.name}. День {preview.loaded.game.day}, монет {preview.loaded.game.money}, постоянных вещей {preview.loaded.game.ownedItems.length}.</p>
        <p>Импорт заменит текущее прохождение, покупки, проекты, истории и достижения. Отменить замену после подтверждения нельзя.</p>
        <button className="projects-close" type="button" onClick={confirmImport}>Заменить и восстановить</button>
        <button className="projects-close" type="button" onClick={() => setPreview(null)}>Отмена импорта</button>
      </div>}
      <button className="projects-close" type="button" onClick={onClose}>Вернуться</button>
    </div>
  </dialog>
}
