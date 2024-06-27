// import { Button } from "@imagebin/buttons";
import {
  DragEvent,
  PointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  WheelEvent,
} from "react";
import "./App.css";
import MainContext from "./MainContext";
import ImageSelector from "./ImageSelector";
import ImageViewer from "./ImageViewer";
import { images } from "./images";

const zoomValues = [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 3, 4, 5, 10, 15, 20, 30, 40, 50, 75, 100];

const zoomSteps = zoomValues.reduce((acc, v, i) => {
  acc[`${i}`] = v;
  return acc;
}, {} as { [key: string]: number });

const getZoomStep = (value: number) => {
  return `${Math.max(zoomValues.indexOf(value), 0)}`;
};

const getZoomValue = (step: number) => {
  return zoomSteps[`${Math.min(zoomValues.length - 1, Math.max(0, step))}`];
};

function App() {
  const [currentImage, setCurrentImage] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [left, setLeft] = useState(0);
  const [top, setTop] = useState(0);

  const refPreloadImage = useRef<null | HTMLImageElement>(null);
  const refContainer = useRef<null | HTMLDivElement>(null);
  const scrollTicking = useRef(false);
  const isDraggingImage = useRef(false);
  const mouseX = useRef(0);
  const mouseY = useRef(0);

  const onImageLoad = useCallback(() => {
    setZoom(1);
    setWidth(
      refPreloadImage.current?.naturalWidth ||
        refPreloadImage.current?.width ||
        0
    );
    setHeight(
      refPreloadImage.current?.naturalHeight ||
        refPreloadImage.current?.height ||
        0
    );
    setLeft(0);
    setTop(0);
  }, []);

  const onWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    if (!scrollTicking.current) {
      window.requestAnimationFrame(() => {
        setZoom((currentZoom) => {
          const v = e.deltaY > 0 ? -1 : 1;
          return getZoomValue(parseInt(getZoomStep(currentZoom)) + v);
        });
        scrollTicking.current = false;
      });

      scrollTicking.current = true;
    }
  }, []);

  const onPointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    mouseX.current = e.clientX;
    mouseY.current = e.clientY;
    isDraggingImage.current = true;
    refContainer.current?.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (isDraggingImage.current) {
      const dx = mouseX.current - e.clientX;
      const dy = mouseY.current - e.clientY;
      setLeft((oldValue) => oldValue + dx);
      setTop((oldValue) => oldValue + dy);
      mouseX.current = e.clientX;
      mouseY.current = e.clientY;
    }
  }, []);

  const onPointerUp = useCallback(() => {
    isDraggingImage.current = false;
  }, []);

  const onDragStart = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const onWindowBlur = useCallback(() => {
    isDraggingImage.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("blur", onWindowBlur);

    return () => {
      window.removeEventListener("blur", onWindowBlur);
    };
  }, [onWindowBlur]);

  const store = useMemo(
    () => ({
      current_image: currentImage,
      zoom,
      width,
      height,
      left,
      top,
    }),
    [currentImage, zoom, width, height, left, top]
  );

  return (
    <MainContext value={store}>
      { images.length > 0 && <img
        ref={refPreloadImage}
        className="absolute opacity-0 -z-10 max-w-none max-h-none"
        onLoad={onImageLoad}
        src={images[currentImage][1]}
        alt=""
      /> }

      <div
        ref={refContainer}
        className="select-none w-full h-full bg-neutral-50 font-sans text-slate-800"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <header className="fixed w-full top-0 left-0 text-center p-3 z-50 pointer-events-none">
          <ImageSelector
            onChange={(e) => setCurrentImage(e.target.selectedIndex)}
          />
        </header>

        <div
          className="flex w-full h-full z-0"
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onDragStart={onDragStart}
        >
          { images.length > 0 && <ImageViewer mode="public" /> }
          { images.length > 0 && <ImageViewer mode="asset" /> }
        </div>

        <footer className="fixed left-0 bottom-0 w-full text-center z-40">
          <div className="inline-block px-4 py-3 rounded-xl rounded-b-none bg-white/30 text-3xl font-bold pointer-events-none">
            {store.zoom * 100}%
          </div>
        </footer>
      </div>
    </MainContext>
  );
}

export default App;
