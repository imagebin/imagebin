import { CSSProperties, PropsWithChildren, useContext, useMemo } from "react";
import MainContext from "./MainContext";
import { images } from "./images";

interface IImageViewer {
  mode: "public" | "asset";
}

const ImageViewer = ({ mode = "public" }: PropsWithChildren<IImageViewer>) => {
  const store = useContext(MainContext);

  const src = useMemo(() => {
    switch (mode) {
      case "public":
        return `/test-images/${images[store.current_image][0]}`;
      case "asset":
        return `${images[store.current_image][1]}`;
      default:
        return "";
    }
  }, [store.current_image, mode]);

  const style = useMemo(
    () =>
      ({
        "--left": `${store.left}px`,
        "--top": `${store.top}px`,
        "--width": `${store.width}px`,
        "--height": `${store.height}px`,
        "--zoom": store.zoom,
        imageRendering: store.zoom > 1 ? "pixelated" : "auto",
      } as CSSProperties),
    [store.left, store.top, store.width, store.height, store.zoom]
  );

  const labelStyles =
    "pointer-events-none z-10 absolute bottom-0 inline-block px-4 py-3 bg-white/30 text-lg font-bold";

  return (
    <div className="relative h-full w-1/2 overflow-clip">
      {mode === "public" ? (
        <div className={`${labelStyles} left-0 rounded-tr-xl`}>original</div>
      ) : (
        <div className={`${labelStyles} right-0 rounded-tl-xl`}>optimized</div>
      )}
      <img
        src={src}
        alt={images[store.current_image][0]}
        className="viewer-image absolute"
        style={style}
      />
    </div>
  );
};

export default ImageViewer;
