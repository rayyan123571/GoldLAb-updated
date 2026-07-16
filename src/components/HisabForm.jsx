import React, { useEffect, useState } from 'react'
import { fmtMoney } from '../logic/units.js'
import { useApp } from '../state/store.jsx'
import { sumAmount } from '../logic/nayaSoda.js'

// حساب — a read-only cash-position panel. Today it holds ONE calculation, بقایا کیش:
// the shop's net cash right now. It only READS (cashDisplay from the store, two
// reportCashBalanceNet calls, and the بقایا نیا سودا rows) and adds them up; it
// writes, prints and persists nothing. Modal shell mirrors AkhrajatForm.
//
// The ladder (top → bottom):
//     کیش  +  رقم لینی ہے  =  میزان
//     میزان  ±  بقایا سودا  =  میزان        (اضافی فروخت adds, اضافی خرید subtracts)
//     میزان  −  رقم دینی ہے  =  بقایا کیش
// Every step is shown so a shopkeeper can check it by hand — an unverifiable cash
// number is one he won't trust.

const hasApi = () => typeof window !== 'undefined' && window.api

// Money formatter that can never emit "-0": Math.round(-0.3) is -0 and
// (-0).toLocaleString() renders "-0", which reads as a bug in a cash figure.
// `|| 0` collapses -0 (falsy) to +0; every other value passes through fmtMoney.
const money = (v) => fmtMoney((Math.round(Number(v) || 0)) || 0)

const BTN = 'urdu text-[16px] font-bold text-black bg-gray-100 border border-gray-400 rounded-sm px-2 py-2.5 min-h-[58px] flex items-center justify-center text-center leading-snug break-words hover:bg-gray-200 active:bg-gray-300 transition-colors'

export default function HisabForm({ open, onClose }) {
  const { cashDisplay } = useApp()
  const [view, setView] = useState('menu')      // 'menu' | 'baqaya'
  const [status, setStatus] = useState('idle')  // 'idle' | 'loading' | 'ready' | 'error'
  const [data, setData] = useState(null)

  // Reset to the menu every time the modal is (re)opened.
  useEffect(() => {
    if (!open) return
    setView('menu'); setStatus('idle'); setData(null)
  }, [open])

  if (!open) return null

  // Fetch the three live sources in parallel, then snapshot the four figures the
  // ladder needs. کیش comes from the store (already cash − expenses), so it is read
  // at compute time, not fetched. بقایا سودا is asked for with NO date bounds: this
  // is a standing position, and filtering it to a day would silently drop every
  // carried-over سودا. Any failure → error state and NO total: a wrong cash
  // position is worse than none.
  const compute = async () => {
    setView('baqaya'); setStatus('loading'); setData(null)
    if (!hasApi()) { setStatus('error'); return }
    try {
      const [lena, dena, bakayaRows] = await Promise.all([
        window.api.reportCashBalanceNet('lena', {}),
        window.api.reportCashBalanceNet('dena', {}),
        window.api.listNayaSoda('bakaya', null, null)
      ])
      if (!lena || !dena || !bakayaRows) { setStatus('error'); return }
      const rows = bakayaRows || []
      const buyRows = rows.filter((r) => r.type === 'khareed')
      const sellRows = rows.filter((r) => r.type === 'farokht')
      setData({
        cash: Number(cashDisplay) || 0,
        // Both sides come back POSITIVE and pre-summed (total_cash); the sign comes
        // from which side was asked for, never from re-summing rows.
        lenaCash: Number(lena.total_cash) || 0,   // owed TO the shop
        denaCash: Number(dena.total_cash) || 0,   // the shop OWES
        // بقایا سودا, signed: فروخت worth minus خرید worth. + ⇒ اضافی فروخت.
        netSoda: sumAmount(sellRows) - sumAmount(buyRows)
      })
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div className="print-overlay fixed inset-0 z-[60] bg-black/50 flex items-start justify-center p-3 pt-[6vh]" onClick={onClose}>
      <div dir="rtl" className="bg-gray-50 border border-gray-300 rounded-xl shadow-2xl w-[480px] max-w-[96vw] max-h-[88vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0 flex items-center justify-between bg-gradient-to-b from-slate-700 to-slate-800 text-white px-4 py-3">
          <h2 className="urdu font-bold text-[18px]">حساب</h2>
          <button type="button" onClick={onClose} title="بند کریں" className="w-8 h-8 flex items-center justify-center rounded-md text-slate-200 hover:bg-white/20 transition-colors">✕</button>
        </div>

        {view === 'menu' ? (
          // View 1 — menu. Built as a list even with one entry; more calculations
          // are coming and this is the pattern they'll slot into.
          <div className="flex-1 min-h-0 overflow-auto p-4">
            <div className="grid grid-cols-1 gap-2 w-[300px]">
              <button type="button" className={BTN} onClick={compute}>بقایا کیش</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col min-h-0 flex-1">
            <div className="shrink-0 flex items-center gap-2 bg-white border-b border-gray-200 px-4 py-2.5">
              <button type="button" onClick={() => setView('menu')} className="urdu text-[13px] font-bold text-blue-700 border border-blue-200 rounded-md px-3 py-1.5 hover:bg-blue-50 transition-colors">← واپس</button>
              <div className="urdu text-[13px] font-bold text-gray-600">بقایا کیش</div>
              <div className="flex-1" />
              {status !== 'loading' && (
                <button type="button" onClick={compute} title="تازہ کریں" className="urdu text-[13px] font-bold text-gray-700 border border-gray-300 rounded-md px-3 py-1.5 hover:bg-gray-100 transition-colors">↻</button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto p-4">
              {status === 'loading' && (
                <div className="urdu text-[15px] font-bold text-gray-500 text-center py-10">حساب ہو رہا ہے…</div>
              )}
              {status === 'error' && (
                <div className="urdu text-[15px] font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-4 py-4 text-center">
                  حساب لوڈ نہیں ہو سکا۔ ↻ سے دوبارہ کوشش کریں۔
                </div>
              )}
              {status === 'ready' && data && <BaqayaCashLadder data={data} />}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// One line of the ladder. `op` is the operator glyph that was APPLIED (+/−); the
// value is the magnitude. Rows with no op (کیش, میزان, بقایا کیش) show the number
// as-is, so a negative figure carries its own minus sign.
function Line({ label, value, op = null, kind = 'row' }) {
  const isSub = kind === 'sub'
  const isHero = kind === 'hero'
  const box =
    isHero ? 'bg-amber-100 border-t-2 border-amber-400 px-4 py-3'
    : isSub ? 'bg-white border-t border-gray-300 px-4 py-2'
    : 'px-4 py-2'
  const labelCls =
    isHero ? 'urdu font-bold text-[17px] text-amber-900'
    : isSub ? 'urdu font-bold text-[14px] text-gray-800'
    : 'urdu font-semibold text-[14px] text-gray-700'
  const valCls =
    isHero ? 'tabular-nums font-bold text-[20px] text-amber-900'
    : 'tabular-nums font-bold text-[15px] text-gray-900'
  return (
    <div className={`flex items-center justify-between gap-3 ${box}`}>
      <span className={labelCls}>{label}</span>
      <span className={valCls} dir="ltr">
        {op ? <span className="text-gray-400 mr-1">{op}</span> : null}{money(value)}
      </span>
    </div>
  )
}

function BaqayaCashLadder({ data }) {
  const { cash, lenaCash, denaCash, netSoda } = data
  const subtotal = cash + lenaCash        // کیش + رقم لینی ہے
  const total = subtotal + netSoda        // ± بقایا سودا
  const baqayaCash = total - denaCash     // − رقم دینی ہے

  // بقایا سودا: state which excess it is and the sign applied. 0 ⇒ shown, no sign
  // (a missing step in a visible chain of arithmetic reads as a bug).
  const sodaLabel = netSoda > 0 ? 'بقایا سودا (اضافی فروخت)'
    : netSoda < 0 ? 'بقایا سودا (اضافی خرید)'
    : 'بقایا سودا'
  const sodaOp = netSoda > 0 ? '+' : netSoda < 0 ? '−' : null
  const sodaVal = Math.abs(netSoda)

  return (
    <div className="bg-white border border-gray-300 rounded-md overflow-hidden">
      <Line label="کیش" value={cash} />
      <Line label="رقم لینی ہے" value={lenaCash} op="+" />
      <Line label="میزان" value={subtotal} kind="sub" />
      <Line label={sodaLabel} value={sodaVal} op={sodaOp} />
      <Line label="میزان" value={total} kind="sub" />
      <Line label="رقم دینی ہے" value={denaCash} op="−" />
      <Line label="بقایا کیش" value={baqayaCash} kind="hero" />
    </div>
  )
}
