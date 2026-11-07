import { LogoMark } from '@/components/layout/LogoMark'

/** Login-page branding (spec §10, Appendix B): the mark beside the company name. */
export function AdminLogo() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        fontSize: 28,
        fontWeight: 700,
      }}
    >
      <LogoMark height={40} />
      Jainav Infotech
    </span>
  )
}
