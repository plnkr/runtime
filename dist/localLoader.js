import { extname } from 'path';
function tryCandidates(candidates, loader) {
    var tryNext = function (idx, errors) {
        if (idx >= candidates.length) {
            var error = new Error('Loading failed');
            error.loadErrors = errors;
            return Promise.reject(error);
        }
        return Promise.resolve(loader(candidates[idx])).then(function (content) {
            return { content: content, pathname: candidates[idx] };
        }, function (error) {
            errors[candidates[idx]] = error;
            return tryNext(idx + 1, errors);
        });
    };
    return tryNext(0, {});
}
export function createLocalLoader(_a) {
    var defaultExtensions = _a.defaultExtensions, runtimeHost = _a.runtimeHost;
    return {
        locate: function (load) {
            if (load.address.indexOf(this.baseURL) !== 0) {
                if (!runtimeHost.fallbackToSystemFetch) {
                    return Promise.reject(new Error("Invariant broken: attempting to load " + load.address + " using the local loader"));
                }
            }
            var initialAddress = load.address;
            var localPath = load.address.slice(this.baseURL.length);
            var ext = extname(localPath);
            var candidates = ext
                ? [localPath]
                : defaultExtensions.map(function (ext) { return "" + localPath + ext; });
            var loadFromHost = function (pathname) {
                return Promise.resolve(runtimeHost.getFileContents(pathname)).then(function (contents) {
                    if (typeof contents !== 'string') {
                        return (Promise.reject(new Error('Not found')));
                    }
                    return contents;
                });
            };
            return tryCandidates(candidates, loadFromHost).then(function (_a) {
                var content = _a.content, pathname = _a.pathname;
                load.source = content;
                return initialAddress.replace(localPath, pathname);
            });
        },
        fetch: function (load, systemFetch) {
            if (typeof load.source === 'string') {
                return load.source;
            }
            if (!runtimeHost.fallbackToSystemFetch) {
                return Promise.reject(new Error("Unable to load " + load.address + " using the local loader"));
            }
            var initialAddress = load.address;
            var localPath = load.address.slice(this.baseURL.length);
            var ext = extname(localPath);
            var candidates = ext
                ? [localPath]
                : defaultExtensions.map(function (ext) { return "" + localPath + ext; });
            var loadWithSystem = function (pathname) {
                load.address = initialAddress.replace(localPath, pathname);
                return systemFetch(load);
            };
            return tryCandidates(candidates, loadWithSystem).then(function (_a) {
                var content = _a.content, pathname = _a.pathname;
                load.address = initialAddress.replace(localPath, pathname);
                return content;
            });
        },
        instantiate: function (load, systemInstantiate) {
            if (load.address.match(/\.json$/i)) {
                return JSON.parse(load.source);
            }
            return systemInstantiate(load);
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbG9jYWxMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQWdCL0IsdUJBQ0ksVUFBb0IsRUFDcEIsTUFBc0I7SUFFdEIsSUFBTSxPQUFPLEdBQUcsVUFDWixHQUFXLEVBQ1gsTUFBcUM7UUFFckMsSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUMxQixJQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRTdCLEtBQU0sQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDO1lBRXhDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoQztRQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ2hELFVBQUEsT0FBTztZQUNILE9BQU8sRUFBRSxPQUFPLFNBQUEsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbEQsQ0FBQyxFQUNELFVBQUEsS0FBSztZQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7WUFFaEMsT0FBTyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQztJQUVGLE9BQU8sT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBRUQsTUFBTSw0QkFBNEIsRUFHWjtRQUZsQix3Q0FBaUIsRUFDakIsNEJBQVc7SUFFWCxPQUFPO1FBQ0gsTUFBTSxZQUFDLElBQUk7WUFDUCxJQUFJLElBQUksQ0FBQyxP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