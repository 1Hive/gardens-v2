import "./board.css";

export const metadata = {
  title: "Gardens Advisory Board",
  description: "Private Gardens security advisory workflow",
  robots: { index: false, follow: false },
  icons: { icon: "data:," },
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
