export function createLocalLoader({ runtimeHost, }) {
    return {
        fetch(load, systemFetch) {
            if (load.address.indexOf(this.baseURL) !== 0) {
                return systemFetch(load);
            }
            const localPath = load.address.slice(this.baseURL.length);
            return Promise.resolve(runtimeHost.getFileContents(localPath)).catch(() => systemFetch(load));
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbG9jYWxMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBTUEsTUFBTSw0QkFBNEIsRUFDOUIsV0FBVyxHQUNPO0lBQ2xCLE9BQU87UUFDSCxLQUFLLENBQUMsSUFBSSxFQUFFLFdBQVc7WUFDbkIsSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUMxQyxPQUFPLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQzthQUM1QjtZQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUM7WUFFMUQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUNsQixXQUFXLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUN6QyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUNyQyxDQUFDO0tBQ0osQ0FBQztBQUNOLENBQUMifQ==