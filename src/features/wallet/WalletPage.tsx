import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertCircle, LoaderCircle, RefreshCcw, Wallet } from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'
import { getErrorMessage } from '../../api/client'
import { SiteHeader } from '../../components/Brand'
import { MotionPage } from '../../components/MotionPage'
import { useAppStore } from '../../store/useAppStore'
import { walletApi, walletKeys } from './walletApi'
import type { PointTransactionDto, PointTransactionType } from './types'

const transactionTypeOptions: Array<{ label: string; value: PointTransactionType | '' }> = [
  { label: 'Tất cả giao dịch', value: '' },
  { label: 'Điểm khởi đầu', value: 'SignupBonus' },
  { label: 'Nạp thêm điểm', value: 'Purchase' },
  { label: 'Thanh toán buổi học', value: 'SessionPayment' },
  { label: 'Thu nhập từ buổi học', value: 'SessionEarning' },
  { label: 'Phần nền tảng giữ lại', value: 'PlatformFee' },
  { label: 'Hoàn điểm', value: 'Refund' },
  { label: 'Cộng điểm thủ công', value: 'AdminGrant' },
  { label: 'Điểm đang giữ', value: 'Held' },
  { label: 'Giải phóng điểm giữ', value: 'HoldRelease' },
]

const TRANSACTION_LIMIT = 20

export function WalletPage() {
  const session = useAppStore((state) => state.session)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState<PointTransactionType | ''>('')

  const summaryQuery = useQuery({
    queryKey: walletKeys.summary(),
    queryFn: walletApi.getSummary,
    refetchInterval: 30_000,
  })

  const transactionsQuery = useQuery({
    queryKey: walletKeys.transactions({ type: typeFilter, page, limit: TRANSACTION_LIMIT }),
    queryFn: () => walletApi.getTransactions({ type: typeFilter, page, limit: TRANSACTION_LIMIT }),
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui lòng đăng nhập để tiếp tục.' }} to="/login" />
  }

  const transactions = transactionsQuery.data?.data ?? []
  const totalPages = Math.max(1, Math.ceil((transactionsQuery.data?.total ?? 0) / TRANSACTION_LIMIT))

  return (
    <MotionPage className="page dashboard-page profile-page session-hub-page">
      <SiteHeader />
      <section className="dashboard-hero profile-hero">
        <div>
          <span className="eyebrow">
            <Wallet size={15} />
            Ví điểm
          </span>
          <h1>Theo dõi số dư, điểm đang giữ và mọi giao dịch gần đây.</h1>
          <p>
            Đây là nơi bạn xem lại toàn bộ thay đổi về điểm khi đăng ký buổi học, hoàn điểm hoặc
            nhận thu nhập từ buổi học.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Về trang của tôi
          </Link>
          <button
            className="button secondary"
            onClick={() => {
              void summaryQuery.refetch()
              void transactionsQuery.refetch()
            }}
            type="button"
          >
            <RefreshCcw size={18} />
            Làm mới
          </button>
        </div>
      </section>

      {summaryQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Đang tải ví điểm...</p>
        </section>
      ) : null}

      {summaryQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Không thể tải ví điểm</h2>
            <p>{getErrorMessage(summaryQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {summaryQuery.data ? (
        <section className="wallet-summary-grid">
          <SummaryCard label="Số dư khả dụng" value={summaryQuery.data.balance} />
          <SummaryCard label="Điểm đang giữ" value={summaryQuery.data.heldBalance} />
          <SummaryCard label="Tổng đã nhận" value={summaryQuery.data.totalEarned} />
          <SummaryCard label="Tổng đã chi" value={summaryQuery.data.totalSpent} />
        </section>
      ) : null}

      <section className="session-board-shell wallet-board-shell">
        <div className="session-board-toolbar">
          <div>
            <h2>Lịch sử giao dịch</h2>
            <p>
              Một số giao dịch chỉ thay đổi phần điểm đang giữ. EdSkill vẫn hiển thị đầy đủ để bạn
              kiểm tra lại từng bước.
            </p>
          </div>
          <label className="session-filter-field">
            <span>Loại giao dịch</span>
            <select
              onChange={(event) => {
                setTypeFilter(event.target.value as PointTransactionType | '')
                setPage(1)
              }}
              value={typeFilter}
            >
              {transactionTypeOptions.map((option) => (
                <option key={option.label} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {transactionsQuery.isLoading ? (
          <section className="profile-state-card">
            <LoaderCircle className="spin" size={20} />
            <p>Đang tải giao dịch...</p>
          </section>
        ) : null}

        {transactionsQuery.isError ? (
          <section className="profile-state-card error">
            <AlertCircle size={20} />
            <p>{getErrorMessage(transactionsQuery.error)}</p>
          </section>
        ) : null}

        {transactionsQuery.data ? (
          <>
            {transactions.length === 0 ? (
              <section className="session-empty-state">
                <h3>Chưa có giao dịch nào.</h3>
                <p>Ví điểm của bạn chưa phát sinh giao dịch cho bộ lọc hiện tại.</p>
              </section>
            ) : (
              <div className="wallet-transaction-list">
                {transactions.map((transaction) => (
                  <article className="wallet-transaction-card" key={transaction.pointTransactionId}>
                    <div className="wallet-transaction-head">
                      <div>
                        <span className={`session-status-chip status-${transaction.type.toLowerCase()}`}>
                          {transaction.type}
                        </span>
                        <h3>{getTransactionTitle(transaction)}</h3>
                      </div>
                      <strong className={getAmountToneClass(transaction.amount)}>
                        {formatSignedPoints(transaction.amount)}
                      </strong>
                    </div>
                    <dl className="wallet-transaction-grid">
                      <div>
                        <dt>Biến động khả dụng</dt>
                        <dd>{formatSignedPoints(transaction.balanceAfter - transaction.balanceBefore)}</dd>
                      </div>
                      <div>
                        <dt>Biến động điểm giữ</dt>
                        <dd>{formatSignedPoints(transaction.heldBalanceAfter - transaction.heldBalanceBefore)}</dd>
                      </div>
                      <div>
                        <dt>Số dư sau giao dịch</dt>
                        <dd>{formatPoints(transaction.balanceAfter)}</dd>
                      </div>
                      <div>
                        <dt>Điểm giữ sau giao dịch</dt>
                        <dd>{formatPoints(transaction.heldBalanceAfter)}</dd>
                      </div>
                      <div>
                        <dt>Thời gian</dt>
                        <dd>{formatDateTime(transaction.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Liên kết</dt>
                        <dd>
                          {transaction.sessionId ? (
                            <Link to={`/dashboard/skills/${transaction.sessionId}`}>Xem buổi học</Link>
                          ) : (
                            'Không có'
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p className="wallet-transaction-note">
                      {transaction.note || 'Không có ghi chú thêm cho giao dịch này.'}
                    </p>
                  </article>
                ))}
              </div>
            )}

            <PaginationControls currentPage={page} onPageChange={setPage} totalPages={totalPages} />
          </>
        ) : null}
      </section>
    </MotionPage>
  )
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="wallet-summary-card">
      <span>{label}</span>
      <strong>{formatPoints(value)}</strong>
    </article>
  )
}

function PaginationControls({
  currentPage,
  onPageChange,
  totalPages,
}: {
  currentPage: number
  onPageChange: (page: number) => void
  totalPages: number
}) {
  return (
    <div className="session-pagination">
      <button
        className="button secondary"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
        type="button"
      >
        Trang trước
      </button>
      <span>
        Trang {currentPage} / {totalPages}
      </span>
      <button
        className="button secondary"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        type="button"
      >
        Trang sau
      </button>
    </div>
  )
}

function getTransactionTitle(transaction: PointTransactionDto) {
  if (transaction.type === 'Held') {
    return 'Điểm đã được giữ cho buổi học'
  }

  if (transaction.type === 'HoldRelease') {
    return 'Điểm giữ đã được trả lại'
  }

  return transaction.type
}

function formatPoints(value: number) {
  return new Intl.NumberFormat().format(value)
}

function formatSignedPoints(value: number) {
  const formatted = formatPoints(Math.abs(value))
  if (value > 0) {
    return `+${formatted}`
  }

  if (value < 0) {
    return `-${formatted}`
  }

  return '0'
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getAmountToneClass(amount: number) {
  if (amount > 0) {
    return 'wallet-amount positive'
  }

  if (amount < 0) {
    return 'wallet-amount negative'
  }

  return 'wallet-amount neutral'
}
