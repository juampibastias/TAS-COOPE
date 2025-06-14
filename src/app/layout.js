// app/layout.js
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import TerminalProvider from '../components/TerminalProvider';

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
});

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
});

export const metadata = {
    title: 'Terminal TAS',
    description: 'Sistema de Terminal de Autoservicio',
};

export default function RootLayout({ children }) {
    return (
        <html lang='es'>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <TerminalProvider>{children}</TerminalProvider>
            </body>
        </html>
    );
}
