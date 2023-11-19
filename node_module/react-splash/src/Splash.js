/*
 * Splash React Component
 *
 * Copyright © Roman Nosov 2016
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.txt file in the root directory of this source tree.
 */
import React, { Component, PropTypes } from 'react';

const
  propTypes = {
    text: PropTypes.string.isRequired,
    src: PropTypes.string.isRequired,
    style: PropTypes.object.isRequired,
  },
  defaultProps = {
    text: 'React Splash',
    src: 'https://source.unsplash.com/weekly',
    style: { height: '100vh' },
  };

function animate(position, minp, maxp) {
  const minv = Math.log(1000);
  const maxv = Math.log(3000);
  const scale = (maxv-minv) / (maxp-minp);
  const duration = Math.exp(minv + scale*(position-minp));
  return {
    WebkitAnimationDuration: `${duration / 1000}s`,
    animationDuration: `${duration / 1000}s`,
  };
}

function chr(w, reverse) {
  const len = w.length;
  return Array.prototype.map.call(w
    , (ch, i) => (
        <span
          key={i}
          className={ reverse ? 'splash-left' : 'splash-right' }
          style={animate(i, 0, len)}
        >
          {ch}
        </span>
      )
  );
}

class Splash extends Component {

  state = {
    isMounted: false,
  };

  componentDidMount() {
    this.setState({ isMounted: true });
  }

  chr(w, reverse) {
    const len = w.length;
    return Array.prototype.map.call(w
      , (ch, i) => (
          <span
            key={i}
            className={ this.state.isMounted ? (reverse ? 'splash-left' : 'splash-right') : void 0 }
            style={ this.state.isMounted ? animate(i, 0, len) : void 0 }
          >
            {ch}
          </span>
        )
    );
  }

  header(text) {
    const [w1, w2] = text.split(' ', 2);
    return (
      <h1>
        {do{
          if (w1)
            <span className="splash-word">{this.chr(w1, true)}</span>
        }}
        {do{
          if (w2)
            <span className="splash-word">{this.chr(w2, false)}</span>
        }}
      </h1>
    );
  }

  render() {
    const { style, className, text, src, children, ...props } = this.props;
     return (
       <div { ...props } style={style} className={ 'splash'+(className?' '+className:'') }>
        <img src={src} />
        {do{
          if (this.state.isMounted) {
            this.header(text)
          }
          else {
            <noscript>
              {this.header(text)}
            </noscript>
          }
        }}
       </div>
     );
  }

}
Splash.propTypes = propTypes;
Splash.defaultProps = defaultProps;

export default Splash;
