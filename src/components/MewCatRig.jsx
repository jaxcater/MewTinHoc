import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const VERT_SRC = `
  attribute vec2 a_pos;
  attribute vec2 a_uv;
  varying vec2 v_uv;

  uniform float u_time;
  uniform vec2 u_look;
  uniform float u_bounce;
  uniform float u_earL;
  uniform float u_earR;
  uniform float u_wave;
  uniform float u_tail;
  uniform float u_tassel;
  uniform vec4 u_tailUv;

  mat2 rot2d(float a) {
    float c = cos(a);
    float s = sin(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    v_uv = a_uv;
    vec2 p = a_pos;
    float u = a_uv.x;
    float v = a_uv.y;

    // Grounded base anchor so feet stay planted while upper body moves
    float upperBody = 1.0 - smoothstep(0.70, 0.94, v);

    // 1. Gentle continuous breathing (chest expansion + soft vertical lift)
    float breathPhase = sin(u_time * 2.1);
    float chestMask = smoothstep(0.34, 0.56, v) * (1.0 - smoothstep(0.68, 0.88, v));
    p.x += (u - 0.5) * chestMask * breathPhase * 0.022;
    p.y += upperBody * breathPhase * 0.014;

    // 2. 2.5D Head bone: neck pivot tilt + pseudo-depth facial parallax
    float headWeight = 1.0 - smoothstep(0.36, 0.62, v);
    vec2 neckPivot = vec2(0.0, -0.06);
    float idleTilt = sin(u_time * 1.15) * 0.022;
    float headAngle = -u_look.x * 0.075 + idleTilt;
    vec2 relHead = p - neckPivot;
    vec2 rotatedHead = rot2d(headAngle) * relHead + neckPivot;
    p = mix(p, rotatedHead, headWeight);

    // Face center moves slightly more than silhouette edge for 2.5D Live2D turn
    float faceCenter = exp(-pow((u - 0.5) * 2.5, 2.0)) * (1.0 - smoothstep(0.35, 0.58, v));
    p.x += u_look.x * 0.042 * faceCenter + u_look.x * 0.018 * headWeight;
    p.y += -u_look.y * 0.032 * faceCenter - u_look.y * 0.014 * headWeight;

    // 3. Independent Left & Right Ear twitch bones
    float earL = smoothstep(0.46, 0.24, u) * smoothstep(0.32, 0.12, v);
    float earR = smoothstep(0.54, 0.76, u) * smoothstep(0.32, 0.12, v);
    p.y += earL * u_earL * 0.028;
    p.x -= earL * u_earL * 0.016;
    p.y += earR * u_earR * 0.028;
    p.x += earR * u_earR * 0.016;

    // 4. Waving paw / side sway bone
    float pawZone = smoothstep(0.44, 0.14, u) * smoothstep(0.26, 0.44, v) * (1.0 - smoothstep(0.56, 0.76, v));
    float waveSwing = sin(u_time * 3.1) * u_wave;
    p.y += pawZone * waveSwing * 0.045;
    p.x += pawZone * cos(u_time * 3.1) * u_wave * 0.022;

    // 4b. Dedicated right-side protruding tail wag bone
    float tailReach = smoothstep(u_tailUv.x, u_tailUv.y, u);
    float tailVert = smoothstep(u_tailUv.z, u_tailUv.z + 0.10, v) * (1.0 - smoothstep(u_tailUv.w - 0.08, u_tailUv.w, v));
    float tailMask = tailReach * tailVert;
    float tailPhase = u_time * 4.2 - tailReach * 2.5;
    p.y += tailMask * sin(tailPhase) * u_tail * 0.056;
    p.x += tailMask * cos(tailPhase) * u_tail * 0.028;

    // 4c. Gentle mortarboard tassel sway on right cap rim
    float tasselMask = smoothstep(0.53, 0.64, u) * smoothstep(0.14, 0.22, v) * (1.0 - smoothstep(0.27, 0.34, v));
    p.x += tasselMask * sin(u_time * 2.5 + 0.7) * u_tassel * 0.018;

    // 5. Elastic squash-and-stretch impulse anchored near bottom
    vec2 basePivot = vec2(0.0, -0.76);
    vec2 fromBase = p - basePivot;
    fromBase.x *= 1.0 - u_bounce * 0.095;
    fromBase.y *= 1.0 + u_bounce * 0.115;
    p = basePivot + fromBase;

    gl_Position = vec4(p, 0.0, 1.0);
  }
`;

const FRAG_SRC = `
  precision mediump float;
  varying vec2 v_uv;
  uniform sampler2D u_tex;
  uniform sampler2D u_texBlink;
  uniform float u_blink;
  uniform float u_hasBlink;
  void main() {
    vec4 openCol = texture2D(u_tex, v_uv);
    if (u_hasBlink > 0.5 && u_blink > 0.001) {
      vec4 blinkCol = texture2D(u_texBlink, v_uv);
      gl_FragColor = mix(openCol, blinkCol, clamp(u_blink, 0.0, 1.0));
    } else {
      gl_FragColor = openCol;
    }
  }
`;

function buildMesh(cols, rows) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r <= rows; r++) {
    const v = r / rows;
    const y = 1.0 - v * 2.0;
    for (let c = 0; c <= cols; c++) {
      const u = c / cols;
      const x = -1.0 + u * 2.0;
      positions.push(x, y);
      uvs.push(u, v);
    }
  }

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i0 = r * (cols + 1) + c;
      const i1 = i0 + 1;
      const i2 = i0 + (cols + 1);
      const i3 = i2 + 1;
      indices.push(i0, i2, i1, i1, i2, i3);
    }
  }

  return {
    positions: new Float32Array(positions),
    uvs: new Float32Array(uvs),
    indices: new Uint16Array(indices),
  };
}

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/**
 * MewLiveRig
 * Live2D-style 2.5D WebGL bone-weighted soft mesh puppet + GSAP spring physics
 * for the Gemini-generated 3D Mew cutouts, with optional blink texture & tail wagging.
 */
export function MewLiveRig({
  src,
  blinkSrc = null,
  alt,
  className = '',
  waveIntensity = 0.65,
  tailIntensity = 0,
  tasselIntensity = 0,
  tailUv = { uStart: 0.62, uEnd: 0.85, vStart: 0.50, vEnd: 0.76 },
  reactionKey = 0,
  onPoke,
  interactive = true,
  priority = false,
}) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const [fallbackMode, setFallbackMode] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  const rigStateRef = useRef({
    lookX: 0,
    lookY: 0,
    bounce: 0,
    earL: 0,
    earR: 0,
    wave: waveIntensity,
    tail: tailIntensity,
    tassel: tasselIntensity,
    blink: 0,
    isVisible: true,
  });

  // Trigger squash-and-stretch + ear perk bounce when reactionKey increments
  useEffect(() => {
    if (!reactionKey || fallbackMode) return;
    const st = rigStateRef.current;
    gsap.killTweensOf(st, 'bounce,earL,earR');
    gsap.timeline()
      .to(st, { bounce: -0.65, earL: 0.9, earR: 0.9, duration: 0.11, ease: 'power2.out' })
      .to(st, { bounce: 0.85, duration: 0.16, ease: 'power2.out' })
      .to(st, { bounce: 0, earL: 0, earR: 0, duration: 0.42, ease: 'elastic.out(1.1, 0.45)' });
  }, [reactionKey, fallbackMode]);

  // Listen to reduced-motion preference changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setFallbackMode(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Pointer head-tracking, periodic ear twitch & natural eye-blink via GSAP
  useEffect(() => {
    if (fallbackMode) return undefined;
    const st = rigStateRef.current;
    st.wave = waveIntensity;
    st.tail = tailIntensity;
    st.tassel = tasselIntensity;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let onMove;
    if (interactive && finePointer.matches) {
      const qLookX = gsap.quickTo(st, 'lookX', { duration: 0.42, ease: 'power3.out' });
      const qLookY = gsap.quickTo(st, 'lookY', { duration: 0.42, ease: 'power3.out' });

      onMove = (e) => {
        const el = wrapRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height * 0.36;
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (window.innerWidth * 0.45)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (window.innerHeight * 0.45)));
        qLookX(nx);
        qLookY(ny);
      };

      window.addEventListener('pointermove', onMove, { passive: true });
    }

    const earTl = gsap.timeline({ repeat: -1, repeatDelay: 2.8 });
    earTl
      .to(st, { earL: 0.75, duration: 0.12, ease: 'power2.out' })
      .to(st, { earL: 0, duration: 0.24, ease: 'power2.inOut' })
      .to(st, { earR: 0.7, duration: 0.12, ease: 'power2.out' }, '+=0.15')
      .to(st, { earR: 0, duration: 0.24, ease: 'power2.inOut' });

    let blinkTl = null;
    if (blinkSrc) {
      blinkTl = gsap.timeline({ repeat: -1, delay: 1.4, repeatDelay: 3.1 });
      blinkTl
        .to(st, { blink: 1, duration: 0.07, ease: 'power2.in' })
        .to(st, { blink: 0, duration: 0.09, ease: 'power2.out' }, '+=0.05')
        .to(st, { blink: 1, duration: 0.07, ease: 'power2.in' }, '+=2.85')
        .to(st, { blink: 0, duration: 0.09, ease: 'power2.out' }, '+=0.04')
        .to(st, { blink: 1, duration: 0.065, ease: 'power2.in' }, '+=0.11')
        .to(st, { blink: 0, duration: 0.085, ease: 'power2.out' }, '+=0.04');
    }

    return () => {
      if (onMove) window.removeEventListener('pointermove', onMove);
      earTl.kill();
      if (blinkTl) blinkTl.kill();
    };
  }, [fallbackMode, interactive, waveIntensity, tailIntensity, tasselIntensity, blinkSrc]);

  // WebGL 2.5D Soft Mesh Puppet Renderer + IntersectionObserver pause
  useEffect(() => {
    if (fallbackMode) return undefined;
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });

    if (!gl) {
      setFallbackMode(true);
      return undefined;
    }

    const vs = compileShader(gl, gl.VERTEX_SHADER, VERT_SRC);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) {
      setFallbackMode(true);
      return undefined;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      setFallbackMode(true);
      return undefined;
    }
    gl.useProgram(program);

    const mesh = buildMesh(32, 32);
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uvBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.uvs, gl.STATIC_DRAW);
    const aUv = gl.getAttribLocation(program, 'a_uv');
    gl.enableVertexAttribArray(aUv);
    gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

    const idxBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

    const tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const texBlink = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texBlink);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));

    const uTex = gl.getUniformLocation(program, 'u_tex');
    const uTexBlink = gl.getUniformLocation(program, 'u_texBlink');
    const uBlink = gl.getUniformLocation(program, 'u_blink');
    const uHasBlink = gl.getUniformLocation(program, 'u_hasBlink');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uLook = gl.getUniformLocation(program, 'u_look');
    const uBounce = gl.getUniformLocation(program, 'u_bounce');
    const uEarL = gl.getUniformLocation(program, 'u_earL');
    const uEarR = gl.getUniformLocation(program, 'u_earR');
    const uWave = gl.getUniformLocation(program, 'u_wave');
    const uTail = gl.getUniformLocation(program, 'u_tail');
    const uTassel = gl.getUniformLocation(program, 'u_tassel');
    const uTailUv = gl.getUniformLocation(program, 'u_tailUv');

    gl.uniform1i(uTex, 0);
    gl.uniform1i(uTexBlink, 1);

    let ready = false;
    let hasBlink = 0;
    let disposed = false;
    let rafId = 0;
    const startTs = performance.now();

    const img = new Image();
    img.decoding = 'async';
    img.src = src;
    img.onload = () => {
      if (disposed) return;
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      ready = true;
      drawFrame();
    };
    img.onerror = () => {
      if (!disposed) setFallbackMode(true);
    };

    if (blinkSrc) {
      const blinkImg = new Image();
      blinkImg.decoding = 'async';
      blinkImg.src = blinkSrc;
      blinkImg.onload = () => {
        if (disposed) return;
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, texBlink);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blinkImg);
        hasBlink = 1;
        if (ready) drawFrame();
      };
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrap.getBoundingClientRect();
      const targetW = Math.max(240, Math.round(rect.width * dpr));
      const targetH = Math.max(240, Math.round(rect.height * dpr));
      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const drawFrame = () => {
      if (disposed || !ready) return;
      resize();
      const st = rigStateRef.current;
      const t = (performance.now() - startTs) * 0.001;

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

      gl.uniform1f(uTime, t);
      gl.uniform2f(uLook, st.lookX, st.lookY);
      gl.uniform1f(uBounce, st.bounce);
      gl.uniform1f(uEarL, st.earL);
      gl.uniform1f(uEarR, st.earR);
      gl.uniform1f(uWave, st.wave);
      gl.uniform1f(uTail, st.tail);
      gl.uniform1f(uTassel, st.tassel);
      gl.uniform4f(uTailUv, tailUv.uStart, tailUv.uEnd, tailUv.vStart, tailUv.vEnd);
      gl.uniform1f(uBlink, st.blink);
      gl.uniform1f(uHasBlink, hasBlink);

      gl.drawElements(gl.TRIANGLES, mesh.indices.length, gl.UNSIGNED_SHORT, 0);
    };

    const tick = () => {
      if (disposed) return;
      if (rigStateRef.current.isVisible) {
        drawFrame();
        rafId = requestAnimationFrame(tick);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries[0]?.isIntersecting ?? true;
        rigStateRef.current.isVisible = visible;
        if (visible && !rafId) {
          rafId = requestAnimationFrame(tick);
        } else if (!visible && rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: 0.05 }
    );
    io.observe(wrap);
    rafId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      io.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      gl.deleteTexture(tex);
      gl.deleteTexture(texBlink);
      gl.deleteBuffer(posBuf);
      gl.deleteBuffer(uvBuf);
      gl.deleteBuffer(idxBuf);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, [src, blinkSrc, tailUv.uStart, tailUv.uEnd, tailUv.vStart, tailUv.vEnd, fallbackMode]);

  const handleClick = () => {
    if (!fallbackMode) {
      const st = rigStateRef.current;
      gsap.killTweensOf(st, 'bounce,earL,earR,wave,tail');
      gsap.timeline()
        .to(st, {
          bounce: -0.7,
          earL: 1.0,
          earR: 1.0,
          wave: waveIntensity * 1.85,
          tail: tailIntensity * 1.85,
          duration: 0.1,
          ease: 'power2.out',
        })
        .to(st, { bounce: 0.9, duration: 0.16, ease: 'power2.out' })
        .to(st, {
          bounce: 0,
          earL: 0,
          earR: 0,
          wave: waveIntensity,
          tail: tailIntensity,
          duration: 0.48,
          ease: 'elastic.out(1.1, 0.45)',
        });
      if (blinkSrc) {
        gsap.timeline()
          .to(st, { blink: 1, duration: 0.07, ease: 'power2.in' })
          .to(st, { blink: 0, duration: 0.11, ease: 'power2.out' }, '+=0.04');
      }
    }
    if (onPoke) onPoke();
  };

  return (
    <div
      ref={wrapRef}
      className={`mew-live-rig ${interactive ? 'is-interactive' : ''} ${className}`}
      onClick={interactive ? handleClick : undefined}
      onMouseEnter={() => {
        if (!fallbackMode && interactive) {
          gsap.to(rigStateRef.current, {
            wave: waveIntensity * 1.6,
            tail: tailIntensity * 1.65,
            duration: 0.35,
            ease: 'power2.out',
          });
        }
      }}
      onMouseLeave={() => {
        if (!fallbackMode && interactive) {
          gsap.to(rigStateRef.current, {
            wave: waveIntensity,
            tail: tailIntensity,
            duration: 0.45,
            ease: 'power2.out',
          });
        }
      }}
      role={interactive && onPoke ? 'button' : undefined}
      tabIndex={interactive && onPoke ? 0 : undefined}
      aria-label={interactive && onPoke ? alt : undefined}
      onKeyDown={
        interactive && onPoke
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleClick();
              }
            }
          : undefined
      }
    >
      {fallbackMode ? (
        <img
          src={src}
          alt={alt}
          width={900}
          height={900}
          fetchPriority={priority ? 'high' : undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          draggable={false}
          className="mew-live-rig-fallback"
        />
      ) : (
        <canvas ref={canvasRef} className="mew-live-rig-canvas" aria-label={alt} role="img" />
      )}
    </div>
  );
}

/**
 * MewBrandMark
 * Rounded-squircle vector logo of Mew the orange cat with glasses (zero legacy repo files).
 */
export function MewBrandMark({ size = 38 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0, display: 'block' }}
    >
      <rect width="64" height="64" rx="18" fill="#FF6B00" />
      <path d="M16 27L13 12L27 20Z" fill="#FFF7ED" />
      <path d="M48 27L51 12L37 20Z" fill="#FFF7ED" />
      <ellipse cx="32" cy="36" rx="19" ry="16" fill="#FFF7ED" />
      <path d="M32 20V26M26 21L27 26M38 21L37 26" stroke="#FF6B00" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="24" cy="35" r="6.5" fill="#FFFFFF" stroke="#431407" strokeWidth="2.6" />
      <circle cx="40" cy="35" r="6.5" fill="#FFFFFF" stroke="#431407" strokeWidth="2.6" />
      <path d="M30.5 34.5H33.5" stroke="#431407" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="24" cy="35" r="2.8" fill="#431407" />
      <circle cx="40" cy="35" r="2.8" fill="#431407" />
      <path d="M30 41H34L32 43.2Z" fill="#FB7185" />
      <path d="M28.5 44.5C30 46.5 31.5 46 32 43.5C32.5 46 34 46.5 35.5 44.5" stroke="#431407" strokeWidth="2.1" strokeLinecap="round" />
    </svg>
  );
}
