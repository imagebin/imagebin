import { ChangeEventHandler, PropsWithChildren } from "react";
import { images } from "./images";

interface IImageSelector {
  onChange?: ChangeEventHandler<HTMLSelectElement>;
}

const ImageSelector = ({
  onChange = () => {},
}: PropsWithChildren<IImageSelector>) => {
  return (
    <select
      onChange={onChange}
      disabled={!images.length}
      className={[
        "pointer-events-auto",
        "bg-white shadow-lg p-4 rounded-xl text-lg outline-0 outline-black/5",
        "hover:outline-2 hover:outline-blue-700 hover:shadow-blue-900/30",
        "focus:outline-2 focus:outline-blue-700 focus:shadow-blue-900/75",
      ].join(" ")}
    >
      {(images.length
        ? images
        : [["No images found...", "", ""]]
      ).map((image) => (
        <option key={image[0]} value={image[0]} className="p-8">
          {image[0]}
        </option>
      ))}
    </select>
  );
};

export default ImageSelector;
