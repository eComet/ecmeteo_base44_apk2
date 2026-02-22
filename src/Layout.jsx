export default function Layout({ children, currentPageName }) {
    return (
        <>
            <style>{`
                html {
                    width: 100%;
                    height: 100%;
                }
                body {
                    width: 100vw;
                    height: 100vh;
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                }
                #root {
                    width: 100%;
                    height: 100%;
                    overflow: auto;
                }
                * {
                    box-sizing: border-box;
                }
            `}</style>
            {children}
        </>
    );
}