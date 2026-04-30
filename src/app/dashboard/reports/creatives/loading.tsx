export default function CreativesReportLoading() {
  return (
    <main
      id="main"
      tabIndex={-1}
      style={{
        flex: 1,
        overflow: 'auto',
        padding: '32px 40px',
        background: '#FAFAFB',
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            height: 36,
            width: 220,
            background: '#EEEFF3',
            borderRadius: 8,
            marginBottom: 12,
          }}
        />
        <div
          style={{
            height: 18,
            width: 360,
            background: '#F2F2F6',
            borderRadius: 6,
            marginBottom: 24,
          }}
        />
        <div
          style={{
            background: 'white',
            border: '1px solid #EEEFF3',
            borderRadius: 8,
            height: 320,
          }}
        />
      </div>
    </main>
  )
}
