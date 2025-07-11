import { useEffect } from "react";
import Image from "next/image";

const ImagePreview = ({ image }: { image: string }) => {

    useEffect(() => {
        console.log(image);
    }, [image]);

    return (
        <div>
            <Image src={image} alt="Image" />
        </div>
    )
}

export default ImagePreview;