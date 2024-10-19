export function friendlySize(size: number, precision: number = 2): string {
    if (size < 1024) {
        return `${size} B`;
    }

    const units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(size) / Math.log(1024));

    const friendlySize = (size / Math.pow(1024, i)).toFixed(precision);
    return `${friendlySize} ${units[i - 1]}`;
}
