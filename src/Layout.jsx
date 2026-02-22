export default function Layout({ children, currentPageName }) {
    return (
        <>
            <style>{`
                html, body {
                    width: 100%;
                    height: 100%;
                    margin: 0;
                    padding: 0;
                    overflow-x: hidden;
                }
                * {
                    box-sizing: border-box;
                }
                @supports (viewport-fit: cover) {
                    body {
                        padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
                    }
                }
            `}</style>
            {children}
        </>
    );
}