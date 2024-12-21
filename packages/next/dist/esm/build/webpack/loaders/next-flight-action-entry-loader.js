function nextFlightActionEntryLoader() {
    const { actions } = this.getOptions();
    const actionList = JSON.parse(actions);
    const individualActions = actionList.map(([path, actionsFromModule])=>{
        return actionsFromModule.map(([id, name])=>{
            return [
                id,
                path,
                name
            ];
        });
    }).flat();
    return `
${individualActions.map(([id, path, name])=>{
        // Re-export the same functions from the original module path as action IDs.
        return `export { ${name} as "${id}" } from ${JSON.stringify(path)}`;
    }).join('\n')}
`;
}
export default nextFlightActionEntryLoader;

//# sourceMappingURL=next-flight-action-entry-loader.js.map