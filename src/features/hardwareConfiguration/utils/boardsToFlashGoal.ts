/** Maps modal selection to ConfigurePipeline.boards_to_flash ([] = all boards on the system). */
export function boardsToFlashGoal(selected: readonly string[], allBoardIds: readonly string[]): string[] {
    const allSorted = [...allBoardIds].sort();
    const selSorted = [...new Set(selected)].sort();
    if (allSorted.length === 0) {
        return [];
    }
    if (selSorted.length === allSorted.length && selSorted.every((id, i) => id === allSorted[i])) {
        return [];
    }
    return selSorted;
}
