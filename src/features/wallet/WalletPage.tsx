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
  { label: 'Tat ca giao dich', value: '' },
  { label: 'Signup bonus', value: 'SignupBonus' },
  { label: 'Purchase', value: 'Purchase' },
  { label: 'Session payment', value: 'SessionPayment' },
  { label: 'Session earning', value: 'SessionEarning' },
  { label: 'Platform fee', value: 'PlatformFee' },
  { label: 'Refund', value: 'Refund' },
  { label: 'Admin grant', value: 'AdminGrant' },
  { label: 'Held', value: 'Held' },
  { label: 'Hold release', value: 'HoldRelease' },
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
    queryFn: () =>
      walletApi.getTransactions({ type: typeFilter, page, limit: TRANSACTION_LIMIT }),
  })

  if (!session?.accessToken) {
    return <Navigate replace state={{ message: 'Vui long dang nhap de tiep tuc.' }} to="/login" />
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
            Wallet points
          </span>
          <h1>Theo doi so du va lich su points.</h1>
          <p>
            So du available, held balance va moi giao dich lien quan den session booking, refund va
            admin grant deu duoc tong hop tai day.
          </p>
        </div>
        <div className="profile-hero-actions">
          <Link className="button secondary" to="/dashboard">
            Ve dashboard
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
            Lam moi
          </button>
        </div>
      </section>

      {summaryQuery.isLoading ? (
        <section className="profile-state-card">
          <LoaderCircle className="spin" size={24} />
          <p>Dang tai wallet summary...</p>
        </section>
      ) : null}

      {summaryQuery.isError ? (
        <section className="profile-state-card error">
          <AlertCircle size={22} />
          <div>
            <h2>Khong the tai wallet</h2>
            <p>{getErrorMessage(summaryQuery.error)}</p>
          </div>
        </section>
      ) : null}

      {summaryQuery.data ? (
        <section className="wallet-summary-grid">
          <SummaryCard label="Available balance" value={summaryQuery.data.balance} />
          <SummaryCard label="Held balance" value={summaryQuery.data.heldBalance} />
          <SummaryCard label="Total earned" value={summaryQuery.data.totalEarned} />
          <SummaryCard label="Total spent" value={summaryQuery.data.totalSpent} />
        </section>
      ) : null}

      <section className="session-board-shell wallet-board-shell">
        <div className="session-board-toolbar">
          <div>
            <h2>Lich su giao dich</h2>
            <p>
              Held transaction co the co amount bang 0. O day FE hien thi bien dong available va
              held balance de khong mat thong tin.
            </p>
          </div>
          <label className="session-filter-field">
            <span>Loai giao dich</span>
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
            <p>Dang tai giao dich...</p>
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
                <h3>Chua co giao dich nao.</h3>
                <p>Wallet cua ban chua phat sinh giao dich cho bo loc hien tai.</p>
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
                        <dt>Available delta</dt>
                        <dd>{formatSignedPoints(transaction.balanceAfter - transaction.balanceBefore)}</dd>
                      </div>
                      <div>
                        <dt>Held delta</dt>
                        <dd>
                          {formatSignedPoints(
                            transaction.heldBalanceAfter - transaction.heldBalanceBefore,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Available after</dt>
                        <dd>{formatPoints(transaction.balanceAfter)}</dd>
                      </div>
                      <div>
                        <dt>Held after</dt>
                        <dd>{formatPoints(transaction.heldBalanceAfter)}</dd>
                      </div>
                      <div>
                        <dt>Created at</dt>
                        <dd>{formatDateTime(transaction.createdAt)}</dd>
                      </div>
                      <div>
                        <dt>Session</dt>
                        <dd>
                          {transaction.sessionId ? (
                            <Link to={`/dashboard/sessions/${transaction.sessionId}`}>
                              {transaction.sessionId.slice(0, 8)}
                            </Link>
                          ) : (
                            'N/A'
                          )}
                        </dd>
                      </div>
                    </dl>
                    <p className="wallet-transaction-note">
                      {transaction.note || 'Khong co ghi chu them cho giao dich nay.'}
                    </p>
                  </article>
                ))}
              </div>
            )}

            <PaginationControls
              currentPage={page}
              onPageChange={setPage}
              totalPages={totalPages}
            />
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
        Trang truoc
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
    return 'Points duoc hold cho session booking'
  }

  if (transaction.type === 'HoldRelease') {
    return 'Held balance duoc giai phong'
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
