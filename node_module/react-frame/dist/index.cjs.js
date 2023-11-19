'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _extends = _interopDefault(require('@babel/runtime/helpers/extends'));
var _objectWithoutPropertiesLoose = _interopDefault(require('@babel/runtime/helpers/objectWithoutPropertiesLoose'));
var _assertThisInitialized = _interopDefault(require('@babel/runtime/helpers/assertThisInitialized'));
var _inheritsLoose = _interopDefault(require('@babel/runtime/helpers/inheritsLoose'));
var React = require('react');
var React__default = _interopDefault(React);
var ReactDOM = _interopDefault(require('react-dom'));

var Frame =
/*#__PURE__*/
function (_Component) {
  _inheritsLoose(Frame, _Component);

  function Frame() {
    var _this;

    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    _this = _Component.call.apply(_Component, [this].concat(args)) || this;

    _this.updateStylesheets = function (styleSheets) {
      var links = _this.head.querySelectorAll('link');

      for (var i = 0, l = links.length; i < l; i++) {
        var link = links[i];
        link.parentNode.removeChild(link);
      }

      if (styleSheets && styleSheets.length) {
        styleSheets.forEach(function (href) {
          var link = document.createElement('link');
          link.setAttribute('rel', 'stylesheet');
          link.setAttribute('type', 'text/css');
          link.setAttribute('href', href);

          _this.head.appendChild(link);
        });
      }
    };

    _this.updateCss = function (css) {
      if (!_this.styleEl) {
        var _el = document.createElement('style');

        _el.type = 'text/css';

        _this.head.appendChild(_el);

        _this.styleEl = _el;
      }

      var el = _this.styleEl;

      if (el.styleSheet) {
        el.styleSheet.cssText = css;
      } else {
        var cssNode = document.createTextNode(css);
        if (_this.cssNode) el.removeChild(_this.cssNode);
        el.appendChild(cssNode);
        _this.cssNode = cssNode;
      }
    };

    _this.renderFrame = function () {
      var _this$props = _this.props,
          styleSheets = _this$props.styleSheets,
          css = _this$props.css;
      var frame = ReactDOM.findDOMNode(_assertThisInitialized(_this));
      var root = document.createElement('div');
      root.setAttribute('id', 'root');
      _this.head = frame.contentDocument.head;
      _this.body = frame.contentDocument.body;

      _this.body.appendChild(root);

      _this.updateStylesheets(styleSheets);

      setTimeout(function () {
        _this.updateCss(css);
      }, 0);
      ReactDOM.render(_this._children, root);
    };

    return _this;
  }

  var _proto = Frame.prototype;

  _proto.componentWillReceiveProps = function componentWillReceiveProps(nextProps) {
    if (nextProps.styleSheets.join('') !== this.props.styleSheets.join('')) {
      this.updateStylesheets(nextProps.styleSheets);
    }

    if (nextProps.css !== this.props.css) {
      this.updateCss(nextProps.css);
    }

    var frame = ReactDOM.findDOMNode(this);
    var root = frame.contentDocument.getElementById('root');

    if (root) {
      ReactDOM.render(nextProps.children, root);
    }
  };

  _proto.componentDidMount = function componentDidMount() {
    setTimeout(this.renderFrame, 0);
  };

  _proto.componentWillUnmount = function componentWillUnmount() {
    ReactDOM.unmountComponentAtNode(ReactDOM.findDOMNode(this).contentDocument.getElementById('root'));
  };

  _proto.render = function render() {
    this._children = this.props.children;

    var _this$props2 = this.props,
        children = _this$props2.children,
        styleSheets = _this$props2.styleSheets,
        css = _this$props2.css,
        props = _objectWithoutPropertiesLoose(_this$props2, ["children", "styleSheets", "css"]);

    return React__default.createElement("iframe", _extends({}, props, {
      onLoad: this.renderFrame
    }));
  };

  return Frame;
}(React.Component);

module.exports = Frame;
