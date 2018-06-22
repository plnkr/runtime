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
    var cssLoader = _a.cssLoader, defaultExtensions = _a.defaultExtensions, runtimeHost = _a.runtimeHost;
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
            if (load.address.match(/\.(css|less)$/)) {
                return cssLoader.instantiate.call(this, load, systemInstantiate);
            }
            return systemInstantiate(load);
        },
        translate: function (load) {
            if (load.address.match(/\.(css|less)$/)) {
                return cssLoader.translate.call(this, load);
            }
            return load.source;
        },
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxMb2FkZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvbG9jYWxMb2FkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLE1BQU0sQ0FBQztBQWlCL0IsdUJBQ0ksVUFBb0IsRUFDcEIsTUFBc0I7SUFFdEIsSUFBTSxPQUFPLEdBQUcsVUFDWixHQUFXLEVBQ1gsTUFBcUM7UUFFckMsSUFBSSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sRUFBRTtZQUMxQixJQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBRTdCLEtBQU0sQ0FBQyxVQUFVLEdBQUcsTUFBTSxDQUFDO1lBRXhDLE9BQU8sT0FBTyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztTQUNoQztRQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQ2hELFVBQUEsT0FBTztZQUNILE9BQU8sRUFBRSxPQUFPLFNBQUEsRUFBRSxRQUFRLEVBQUUsVUFBVSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUM7UUFDbEQsQ0FBQyxFQUNELFVBQUEsS0FBSztZQUNELE1BQU0sQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUM7WUFFaEMsT0FBTyxPQUFPLENBQUMsR0FBRyxHQUFHLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNwQyxDQUFDLENBQ0osQ0FBQztJQUNOLENBQUMsQ0FBQztJQUVGLE9BQU8sT0FBTyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBRUQsTUFBTSw0QkFBNEIsRUFJWjtRQUhsQix3QkFBUyxFQUNULHdDQUFpQixFQUNqQiw0QkFBVztJQUVYLE9BQU87UUFDSCxNQUFNLFlBQUMsSUFBSTtZQUNQLElBQUks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