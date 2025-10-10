export const logger = (message: string) => {
    if (import.meta.env.VITE_ENABLE_LOGS === 'true') {
        console.log(message);
    }
}