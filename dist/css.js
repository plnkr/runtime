import MagicString from 'magic-string';
function createRegisterFunction(code) {
    var ms = new MagicString(code);
    ms.overwrite(0, ms.length(), JSON.stringify(code));
    ms.prepend("System.register([], " + registerTemplateParts[0]);
    ms.append(registerTemplateParts[1] + ");");
    return ms.toString();
}
export function transpileCss(runtime, key, code) {
    if (key.endsWith('.less')) {
        return transpileLess(runtime, key, code);
    }
    return createRegisterFunction(code);
}
function transpileLess(runtime, key, code) {
    return runtime
        .import('less/browser', key)
        .then(function (browser) {
        var less = browser(window, {});
        var options = {
            filename: key,
        };
        return less.render(code, options).then(function (renderOutput) {
            return createRegisterFunction(renderOutput.css);
        });
    });
}
var registerTemplate = function ($__export) {
    var element;
    var markup;
    function __onAfterUnload(event) {
        if (element) {
            element.remove();
        }
        event.preventDefault();
    }
    $__export('__onAfterUnload', __onAfterUnload);
    return {
        execute: function () {
            markup = '<CSS>';
            $__export('markup', markup);
            element = document.createElement('style');
            element.type = 'text/css';
            element.innerHTML = markup;
            document.head.appendChild(element);
            $__export('element', element);
        },
    };
};
var registerTemplateParts = registerTemplate
    .toString()
    .split(/'<CSS>'|"<CSS>"/);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2Nzcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFDQSxPQUFPLFdBQVcsTUFBTSxjQUFjLENBQUM7QUFRdkMsZ0NBQWdDLElBQVk7SUFDeEMsSUFBTSxFQUFFLEdBQUcsSUFBSSxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7SUFFakMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLE1BQU0sRUFBRSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUVuRCxFQUFFLENBQUMsT0FBTyxDQUFDLHlCQUF1QixxQkFBcUIsQ0FBQyxDQUFDLENBQUcsQ0FBQyxDQUFDO0lBQzlELEVBQUUsQ0FBQyxNQUFNLENBQUkscUJBQXFCLENBQUMsQ0FBQyxDQUFDLE9BQUksQ0FBQyxDQUFDO0lBRTNDLE9BQU8sRUFBRSxDQUFDLFFBQVEsRUFBRSxDQUFDO0FBQ3pCLENBQUM7QUFFRCxNQUFNLHVCQUNGLE9BQWdCLEVBQ2hCLEdBQVcsRUFDWCxJQUFZO0lBRVosSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFO1FBQ3ZCLE9BQU8sYUFBYSxDQUFDLE9BQU8sRUFBRSxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7S0FDNUM7SUFFRCxPQUFPLHNCQUFzQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3hDLENBQUM7QUFNRCx1QkFDSSxPQUFnQixFQUNoQixHQUFXLEVBQ1gsSUFBWTtJQUVaLE9BQU8sT0FBTztTQUNULE1BQU0sQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDO1NBQzNCLElBQUksQ0FBQyxVQUFDLE9BQTJCO1FBQzlCLElBQU0sSUFBSSxHQUFHLE9BQU8sQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakMsSUFBTSxPQUFPLEdBQWlCO1lBQzFCLFFBQVEsRUFBRSxHQUFHO1NBQ2hCLENBQUM7UUFDRixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFBLFlBQVk7WUFDL0MsT0FBTyxzQkFBc0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDcEQsQ0FBQyxDQUFDLENBQUM7SUFDUCxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUM7QUFFRCxJQUFNLGdCQUFnQixHQUFHLFVBQVMsU0FBeUI7SUFDdkQsSUFBSSxPQUF5QixDQUFDO0lBQzlCLElBQUksTUFBYyxDQUFDO0lBRW5CLHlCQUF5QixLQUF1QjtRQUM1QyxJQUFJLE9BQU8sRUFBRTtZQUNULE9BQU8sQ0FBQyxNQUFNLEVBQUUsQ0FBQztTQUNwQjtRQUVELEtBQUssQ0FBQyxjQUFjLEVBQUUsQ0FBQztJQUMzQixDQUFDO0lBRUQsU0FBUyxDQUFDLGlCQUFpQixFQUFFLGVBQWUsQ0FBQyxDQUFDO0lBRTlDLE9BQU87UUFDSCxPQUFPLEVBQUU7WUFDTCxNQUFNLEdBQUcsT0FBTyxDQUFDO1lBRWpCLFNBQVMsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFNUIsT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDMUMsT0FBTyxDQUFDLElBQUksR0FBRyxVQUFVLENBQUM7WUFDMUIsT0FBTyxDQUFDLFNBQVMsR0FBRyxNQUFNLENBQUM7WUFFM0IsUUFBUSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFbkMsU0FBUyxDQUFDLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUNsQyxDQUFDO0tBQ0osQ0FBQztBQUNOLENBQUMsQ0FBQztBQUVGLElBQU0scUJBQXFCLEdBQUcsZ0JBQWdCO0tBQ3pDLFFBQVEsRUFBRTtLQUNWLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDIn0=