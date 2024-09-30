import classnames from 'classnames'
import { buttonGroup, Leva, useControls } from 'leva'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { isMobile } from 'react-device-detect'

interface SourceCodeCharProps {
  index: number
  checkHighlight: (rect?: DOMRect) => boolean
  children?: React.ReactNode
}

const SourceCodeChar: React.FC<SourceCodeCharProps> = ({ index, checkHighlight, children }) => {
  const el = useRef<HTMLSpanElement>(null)
  const [highlight, setHighlight] = useState(false)

  useEffect(() => {
    // if (index === 0) console.log('update highlight')
    // console.log(index)
    setHighlight(checkHighlight(el.current?.getBoundingClientRect()))
  }, [checkHighlight])

  return (
    <span ref={el} className={classnames({ 'text-[var(--labelTextColor)]': highlight })}>
      {children}
    </span>
  )
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>

  return function (this: ThisParameterType<T>, ...args: Parameters<T>) {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      func.apply(context, args)
    }, wait)
  }
}

const SourceCodeLabelGenerator: React.FC = () => {
  const {
    text,
    labelText,
    labelSize,
    labelThreshold,
    labelOffsetX,
    labelOffsetY,
    bgColor,
    textColor,
    labelTextColor,
    forConsole,
    showCanvas,
  } = useControls({
    text: 'ヒミツのことば',
    labelText: 'SOURCE CODE',
    labelSize: {
      value: isMobile ? 70 : 110,
      min: 0,
      max: 300,
      step: 1,
    },
    labelThreshold: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.01,
    },
    labelOffsetX: {
      value: isMobile ? 20 : 30,
      min: 0,
      max: 300,
      step: 1,
    },
    labelOffsetY: {
      value: isMobile ? 50 : 60,
      min: 0,
      max: 300,
      step: 1,
    },
    bgColor: '#000000',
    textColor: '#00ff00',
    labelTextColor: '#ffffff',
    forConsole: false,
    showCanvas: false,

    note: {
      value: `お友達にもらった日本酒のラベルをジェネレートできるようにしてみた。ラベルのコードそのままだと動作しないので forConsole にチェックを入れた状態でコンソールにコピペ/実行すると text の内容が復元されるのがわかります。関連リンクから飛べるサイトにはプログラマ向けのちょっとした仕掛けもあって、細かいところまで作り込まれた企画だなと関心した。ヒント: 飲み方→ペアリングの項目`,
      editable: false,
    },
    ' ': buttonGroup({
      関連リンク: () => (location.href = 'https://kurand.jp/products/sourcecode'),
    }),
  })
  const [sourceCode, setSourceCode] = React.useState('')
  const [updateCheckHighlight, setUpdateCheckHighlight] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const resizeObserver = new ResizeObserver(
      debounce((_entries) => {
        // console.log('change updateCheckHighlight on resize')
        setUpdateCheckHighlight((value) => !value)
      }, 500),
    )
    resizeObserver.observe(wrapperRef.current)
  }, [])

  useEffect(() => {
    // console.log('change updateCheckHighlight on params change')
    setUpdateCheckHighlight((value) => !value)
  }, [labelText, labelSize, labelThreshold, labelOffsetX, labelOffsetY])

  useEffect(() => {
    const sc = `console.log(${text
      .split('')
      .map((c) => {
        return `String.fromCodePoint([${c
          .codePointAt(0)
          .toString()
          .split('')
          .map((c) => {
            switch (c) {
              case '0':
                return '~~[]'
              case '1':
                return '+!![]'
              default:
                return new Array(+c).fill('!![]').join('+')
            }
          })
          .join(',')}].join(""))`
      })
      .join(',')},)`

    setSourceCode(forConsole ? sc : new Array((6220 / sc.length + 0.5) | 0).fill(sc).join(''))
  }, [text, forConsole])

  const checkHighlight = useMemo(() => {
    const wrapperRect = wrapperRef.current?.getBoundingClientRect()
    const ctx = canvasRef.current?.getContext('2d')
    // console.log('wrapperRect', wrapperRect)

    if (wrapperRect && ctx) {
      canvasRef.current.width = wrapperRect.width
      canvasRef.current.height = wrapperRect.height

      ctx.clearRect(0, 0, wrapperRect.width, wrapperRect.height)
      ctx.font = `normal ${labelSize}px sans-serif`
      ctx.fillStyle = 'white'

      const texts = labelText.split(' ')
      //(wrapperRect.width - Math.max(...texts.map((text) => ctx.measureText(text).width))) / 2
      const offsetY = wrapperRect.height / 2 - (texts.length * labelSize) / 2 + labelSize
      texts.forEach((text, index) => {
        ctx.fillText(text, labelOffsetX, labelOffsetY + (index + 1) * labelSize)
      })
    }

    return (rect?: DOMRect) => {
      if (forConsole || !wrapperRect || !rect) return false
      const { data, width, height } = ctx.getImageData(
        rect.x - wrapperRect.x,
        rect.y - wrapperRect.y,
        rect.width,
        rect.height,
      )
      let alpha = 0
      for (let i = 3; i < data.length; i += 4) {
        alpha += data[i]
      }
      return alpha / (width * height) / 255 > labelThreshold
    }
  }, [updateCheckHighlight])

  return (
    <>
      <Leva
        hideCopyButton={true}
        collapsed={isMobile}
        titleBar={isMobile ? { position: { x: 10, y: -10 } } : true}
        theme={
          isMobile
            ? {
                sizes: {
                  titleBarHeight: '30px',
                },
              }
            : {}
        }
      />
      <div
        className="flex h-screen w-screen items-center justify-center bg-[var(--bgColor)] leading-none"
        style={
          {
            '--bgColor': bgColor,
            '--textColor': textColor,
            '--labelTextColor': labelTextColor,
          } as React.CSSProperties
        }
      >
        <div
          ref={wrapperRef}
          className="w-full resize break-all text-8 text-[var(--textColor)] md:w-[600px] md:text-10"
        >
          {sourceCode.split('').map((c, index) => (
            <SourceCodeChar key={index} index={index} checkHighlight={checkHighlight}>
              {c}
            </SourceCodeChar>
          ))}
        </div>
        <div
          className={classnames({
            absolute: true,
            'opacity-40': true,
            'pointer-events-none': true,
            hidden: !showCanvas,
          })}
        >
          <canvas ref={canvasRef} className="border" />
        </div>
      </div>
    </>
  )
}
export default SourceCodeLabelGenerator
