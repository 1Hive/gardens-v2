import type { AppProps } from 'next/app'
import 'nextra-theme-docs/style.css'

function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />
}

export default App
