export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/milo';
export const sitePath = (path: string) => `${basePath}${path}`;
