import { Component } from 'react'
import { Link } from 'react-router-dom'

/**
 * Catches render errors so one broken page does not blank the whole app.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    if (typeof console !== 'undefined') {
      console.error('ErrorBoundary', error, info?.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      const message = this.state.error?.message ? String(this.state.error.message) : 'เกิดข้อผิดพลาดระหว่างแสดงหน้า'
      return (
        <div className="mx-auto max-w-lg py-16 text-center" role="alert">
          <p className="text-sm font-semibold text-rose-700 dark:text-rose-300">เกิดข้อผิดพลาด</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">หน้านี้แสดงผลไม่ได้</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{message}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-primary text-sm"
              onClick={() => this.setState({ error: null })}
            >
              ลองใหม่
            </button>
            <Link to="/" className="btn-secondary text-sm">กลับภาพรวม</Link>
            <Link to="/today" className="btn-secondary text-sm">ไปวันนี้</Link>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
