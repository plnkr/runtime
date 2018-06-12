export function createLocalLoader(_a) {
    var runtimeHost = _a.runtimeHost;
    return {
        fetch: function (load, systemFetch) {
            if (load.address.indexOf(this.baseURL) !== 0) {
                return systemFetch(load);
            }
            var localPath = load.address.slice(this.baseURL.length);
            return Promise.resolve(runtimeHost.getFileContents(localPath)).catch(function () { return systemFetch(load); });
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbG9jYWxMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsTUFBTSw0QkFBNEIsRUFFWjtRQURsQiw0QkFBVztJQUVYLE9BQU87UUFDSCxLQUFLLFlBQUMsSUFBSSxFQUFFLFdBQVc7WUFDbkIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMxQyxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM1QjtZQUVELElBQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFMUQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUNsQixXQUFXLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUN6QyxDQUFDLEtBQUssQ0FBQyxjQUFNLE9BQUEsV0FBVyxDQUFDLElBQUksQ0FBQyxFQUFqQixDQUFpQixDQUFDLENBQUM7UUFDckMsQ0FBQztLQUNKLENBQUM7QUFDTixDQUFDIn0=