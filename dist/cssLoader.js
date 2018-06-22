// Todo create factory functions for less loader that takes in the runtime;
export function createCssLoader(_a) {
    var runtime = _a.runtime;
    return {
        instantiate: function (load) {
            if (typeof document === 'undefined') {
                return;
            }
            var style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = load.metadata.style;
            document.head.appendChild(style);
            return {
                element: style,
                markup: load.metadata.style,
            };
        },
        translate: function (load) {
            var transpiler;
            if (/\.css$/.test(load.address)) {
                transpiler = cssTranspiler;
            }
            else if (/\.less$/.test(load.address)) {
                transpiler = lessTranspiler;
            }
            else {
                throw new Error("Unexpected css transpilation request for '" + load.address + "'");
            }
            return Promise.resolve(transpiler.call(this, load.source, {
                address: load.address,
                runtime: runtime,
            })).then(function (result) {
                load.metadata.style = result.css;
                load.metadata.styleSourceMap = result.map;
                if (result.moduleFormat) {
                    load.metadata.format = result.moduleFormat;
                }
                return result.moduleSource || '';
            });
        },
    };
}
function cssTranspiler(css) {
    return { css: css };
}
function lessTranspiler(css, _a) {
    var address = _a.address, runtime = _a.runtime;
    return runtime
        .import('less/browser')
        .then(function (browser) {
        var less = browser(window, {});
        return less.render(css, {
            filename: address,
        });
    })
        .then(function (output) {
        return {
            css: output.css,
            map: output.map,
            // style plugins can optionally return a modular module
            // source as well as the stylesheet above
            moduleSource: null,
            moduleFormat: null,
        };
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzTG9hZGVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Nzc0xvYWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFzQkEsMkVBQTJFO0FBRTNFLE1BQU0sMEJBQTBCLEVBQTZCO1FBQTNCLG9CQUFPO0lBQ3JDLE9BQU87UUFDSCxXQUFXLFlBQUMsSUFBbUI7WUFDM0IsSUFBSSxPQUFPLFFBQVEsS0FBSyxXQUFXLEVBQUU7Z0JBQ2pDLE9BQU87YUFDVjtZQUVELElBQU0sS0FBSyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFOUMsS0FBSyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7WUFDeEIsS0FBSyxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQztZQUV0QyxRQUFRLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUVqQyxPQUFPO2dCQUNILE9BQU8sRUFBRSxLQUFLO2dCQUNkLE1BQU0sRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUs7YUFDOUIsQ0FBQztRQUNOLENBQUM7UUFDRCxTQUFTLFlBQUMsSUFBbUI7WUFDekIsSUFBSSxVQUF5QixDQUFDO1lBRTlCLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUU7Z0JBQzdCLFVBQVUsR0FBRyxhQUFhLENBQUM7YUFDOUI7aUJBQU0sSUFBSSxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDckMsVUFBVSxHQUFHLGNBQWMsQ0FBQzthQUMvQjtpQkFBTTtnQkFDSCxNQUFNLElBQUksS0FBSyxDQUNYLCtDQUE2QyxJQUFJLENBQUMsT0FBTyxNQUFHLENBQy9ELENBQUM7YUFDTDtZQUVELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FDbEIsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE1BQU0sRUFBRTtnQkFDL0IsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO2dCQUNyQixPQUFPLFNBQUE7YUFDVixDQUFDLENBQ0wsQ0FBQyxJQUFJLENBQUMsVUFBQyxNQUEyQjtnQkFDL0IsSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFDakMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxjQUFjLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQztnQkFFMUMsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFO29CQUNyQixJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO2lCQUM5QztnQkFFRCxPQUFPLE1BQU0sQ0FBQyxZQUFZLElBQUksRUFBRSxDQUFDO1lBQ3JDLENBQUMsQ0FBQyxDQUFDO1FBQ1AsQ0FBQztLQUNKLENBQUM7QUFDTixDQUFDO0FBRUQsdUJBQXVCLEdBQVc7SUFDOUIsT0FBTyxFQUFFLEdBQUcsS0FBQSxFQUFFLENBQUM7QUFDbkIsQ0FBQztBQUVELHdCQUNJLEdBQVcsRUFDWCxFQUEwQztRQUF4QyxvQkFBTyxFQUFFLG9CQUFPO0lBRWxCLE9BQU8sT0FBTztTQUNULE1BQU0sQ0FBQyxjQUFjLENBQUM7U0FDdEIsSUFBSSxDQUFDLFVBQUMsT0FBWTtRQUNmLElBQU0sSUFBSSxHQUFlLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFN0MsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRTtZQUNwQixRQUFRLEVBQUUsT0FBTztTQUNwQixDQUFDLENBQUM7SUFDUCxDQUFDLENBQUM7U0FDRCxJQUFJLENBQUMsVUFBQSxNQUFNO1FBQ1IsT0FBTztZQUNILEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRztZQUNmLEdBQUcsRUFBRSxNQUFNLENBQUMsR0FBRztZQUVmLHVEQUF1RDtZQUN2RCx5Q0FBeUM7WUFDekMsWUFBWSxFQUFFLElBQUk7WUFDbEIsWUFBWSxFQUFFLElBQUk7U0FDckIsQ0FBQztJQUNOLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQyJ9