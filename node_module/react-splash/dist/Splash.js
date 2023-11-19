"use strict";function _interopRequireDefault(e){return e&&e.__esModule?e:{default:e}}function animate(e,t,r){var a=Math.log(1e3),s=Math.log(3e3),l=(s-a)/(r-t),i=Math.exp(a+l*(e-t));return{WebkitAnimationDuration:i/1e3+"s",animationDuration:i/1e3+"s"}}function chr(e,t){var r=e.length;return Array.prototype.map.call(e,function(e,a){return _react2.default.createElement("span",{key:a,className:t?"splash-left":"splash-right",style:animate(a,0,r)},e)})}Object.defineProperty(exports,"__esModule",{value:!0});var _extends2=require("babel-runtime/helpers/extends"),_extends3=_interopRequireDefault(_extends2),_objectWithoutProperties2=require("babel-runtime/helpers/objectWithoutProperties"),_objectWithoutProperties3=_interopRequireDefault(_objectWithoutProperties2),_slicedToArray2=require("babel-runtime/helpers/slicedToArray"),_slicedToArray3=_interopRequireDefault(_slicedToArray2),_getPrototypeOf=require("babel-runtime/core-js/object/get-prototype-of"),_getPrototypeOf2=_interopRequireDefault(_getPrototypeOf),_classCallCheck2=require("babel-runtime/helpers/classCallCheck"),_classCallCheck3=_interopRequireDefault(_classCallCheck2),_createClass2=require("babel-runtime/helpers/createClass"),_createClass3=_interopRequireDefault(_createClass2),_possibleConstructorReturn2=require("babel-runtime/helpers/possibleConstructorReturn"),_possibleConstructorReturn3=_interopRequireDefault(_possibleConstructorReturn2),_inherits2=require("babel-runtime/helpers/inherits"),_inherits3=_interopRequireDefault(_inherits2),_react=require("react"),_react2=_interopRequireDefault(_react),propTypes={text:_react.PropTypes.string.isRequired,src:_react.PropTypes.string.isRequired,style:_react.PropTypes.object.isRequired},defaultProps={text:"React Splash",src:"https://source.unsplash.com/weekly",style:{height:"100vh"}},Splash=function(e){function t(){var e,r,a,s;(0,_classCallCheck3.default)(this,t);for(var l=arguments.length,i=Array(l),o=0;o<l;o++)i[o]=arguments[o];return r=a=(0,_possibleConstructorReturn3.default)(this,(e=t.__proto__||(0,_getPrototypeOf2.default)(t)).call.apply(e,[this].concat(i))),a.state={isMounted:!1},s=r,(0,_possibleConstructorReturn3.default)(a,s)}return(0,_inherits3.default)(t,e),(0,_createClass3.default)(t,[{key:"componentDidMount",value:function(){this.setState({isMounted:!0})}},{key:"chr",value:function(e,t){var r=this,a=e.length;return Array.prototype.map.call(e,function(e,s){return _react2.default.createElement("span",{key:s,className:r.state.isMounted?t?"splash-left":"splash-right":void 0,style:r.state.isMounted?animate(s,0,a):void 0},e)})}},{key:"header",value:function(e){var t=e.split(" ",2),r=(0,_slicedToArray3.default)(t,2),a=r[0],s=r[1];return _react2.default.createElement("h1",null,a?_react2.default.createElement("span",{className:"splash-word"},this.chr(a,!0)):void 0,s?_react2.default.createElement("span",{className:"splash-word"},this.chr(s,!1)):void 0)}},{key:"render",value:function(){var e=this.props,t=e.style,r=e.className,a=e.text,s=e.src,l=(e.children,(0,_objectWithoutProperties3.default)(e,["style","className","text","src","children"]));return _react2.default.createElement("div",(0,_extends3.default)({},l,{style:t,className:"splash"+(r?" "+r:"")}),_react2.default.createElement("img",{src:s}),this.state.isMounted?this.header(a):_react2.default.createElement("noscript",null,this.header(a)))}}]),t}(_react.Component);Splash.propTypes=propTypes,Splash.defaultProps=defaultProps,exports.default=Splash,module.exports=exports.default;