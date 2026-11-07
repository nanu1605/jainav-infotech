import Image from 'next/image'

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
      <Mark height={40} />
      Jainav Infotech
    </span>
  )
}

/**
 * The black and the white mark; (payload)/custom.scss hides the one that doesn't match the theme
 * Payload sets on <html>.
 */
export function Mark({ height }: { height: number }) {
  const width = Math.round((height * 1024) / 963)
  return (
    <>
      <Image
        src="/brand/logo-mark-light.png"
        alt=""
        width={width}
        height={height}
        className="jainav-mark jainav-mark--light"
      />
      <Image
        src="/brand/logo-mark-dark.png"
        alt=""
        width={width}
        height={height}
        className="jainav-mark jainav-mark--dark"
      />
    </>
  )
}
