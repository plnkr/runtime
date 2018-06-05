let cachedSupportsDynamicImport;
export function supportsDynamicImport() {
    if (typeof cachedSupportsDynamicImport !== 'boolean') {
        try {
            // tslint:disable-next-line no-unused-expression
            new Function('import("")');
            cachedSupportsDynamicImport = true;
        }
        catch (err) {
            cachedSupportsDynamicImport = false;
        }
    }
    return cachedSupportsDynamicImport;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmVhdHVyZURldGVjdGlvbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9mZWF0dXJlRGV0ZWN0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLElBQUksMkJBQW9DLENBQUM7QUFFekMsTUFBTTtJQUNGLElBQUksT0FBTywyQkFBMkIsS0FBSyxTQUFTLEVBQUU7UUFDbEQsSUFBSTtZQUNBLGdEQUFnRDtZQUNoRCxJQUFJLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQztZQUMzQiwyQkFBMkIsR0FBRyxJQUFJLENBQUM7U0FDdEM7UUFBQyxPQUFPLEdBQUcsRUFBRTtZQUNWLDJCQUEyQixHQUFHLEtBQUssQ0FBQztTQUN2QztLQUNKO0lBRUQsT0FBTywyQkFBMkIsQ0FBQztBQUN2QyxDQUFDIn0=