/*! cornerstone-wado-image-loader - v0.7.2 - 2015-09-18 | (c) 2014 Chris Hafey | https://github.com/chafey/cornerstoneWADOImageLoader */
//
// This is a cornerstone image loader for WADO-URI requests.  It has limited support for compressed
// transfer syntaxes, check here to see what is currently supported:
//
// https://github.com/chafey/cornerstoneWADOImageLoader/blob/master/docs/TransferSyntaxes.md
//
// It will support implicit little endian transfer syntaxes but explicit little endian is strongly preferred
// to avoid any parsing issues related to SQ elements.  To request that the WADO object be returned as explicit little endian, append
// the following on your WADO url: &transferSyntax=1.2.840.10008.1.2.1
//

var cornerstoneWADOImageLoader = {
  internal: {
    options : {
      // callback allowing customization of the xhr (e.g. adding custom auth headers, cors, etc)
      beforeSend: function (xhr) {
      }
    },
    multiFrameCacheHack : {}
  }
};

(function (cornerstoneWADOImageLoader) {
  function convertRGB(imgObj, decodedImageFrame, rgbaBuffer) {
    if(imgObj.planarConfiguration === 0)
      cornerstoneWADOImageLoader.convertRGBColorByPixel(decodedImageFrame, rgbaBuffer);
    else
      cornerstoneWADOImageLoader.convertRGBColorByPlane(decodedImageFrame, rgbaBuffer);
  }

  function convertColorSpace(imgObj, decodedImageFrame) {
    var photometricInterpretation = imgObj.photometricInterpretation,
        imageData = new ImageData(imgObj.width, imgObj.height);


    // convert based on the photometric interpretation
    if (photometricInterpretation === "RGB" ||
        photometricInterpretation === "YBR_RCT" ||
        photometricInterpretation === "YBR_ICT")
      convertRGB(imgObj, decodedImageFrame, imageData.data);

    //TODO put palette into imgObj
    /*
    else if( photometricInterpretation === "PALETTE COLOR" )
      cornerstoneWADOImageLoader.convertPALETTECOLOR(imgObj, decodedImageFrame, imageData.data);
    */
    else if( photometricInterpretation === "YBR_FULL_422" ||
             photometricInterpretation === "YBR_FULL" )
      cornerstoneWADOImageLoader.convertYBRFull(decodedImageFrame, imageData.data);
  
    else
        throw "no color space conversion for photometric interpretation " + photometricInterpretation;
  
    return imageData;
  }

  // module exports
  cornerstoneWADOImageLoader.convertColorSpace = convertColorSpace;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function convertPALETTECOLOR( imgObj, imageFrame, rgbaBuffer) {
    var len=dataSet.int16('x00281101',0);
    var start=dataSet.int16('x00281101',1);
    var bits=dataSet.int16('x00281101',2);
    var shift = (bits===8 ? 0 : 8 );

    var buffer = dataSet.byteArray.buffer;
    var rData=new Uint16Array( buffer, dataSet.elements.x00281201.dataOffset, len );
    var gData=new Uint16Array( buffer, dataSet.elements.x00281202.dataOffset, len );
    var bData=new Uint16Array( buffer, dataSet.elements.x00281203.dataOffset, len );

    var numPixels = dataSet.uint16('x00280010') * dataSet.uint16('x00280011');
    var palIndex=0;
    var rgbaIndex=0;

    for( var i=0 ; i < numPixels ; ++i ) {
      var value=imageFrame[palIndex++];
      if( value < start )
        value=0;
      else if( value > start + len -1 )
        value=len-1;
      else
        value=value-start;

      rgbaBuffer[ rgbaIndex++ ] = rData[value] >> shift;
      rgbaBuffer[ rgbaIndex++ ] = gData[value] >> shift;
      rgbaBuffer[ rgbaIndex++ ] = bData[value] >> shift;
      rgbaBuffer[ rgbaIndex++ ] = 255;
    }

  }

  // module exports
  cornerstoneWADOImageLoader.convertPALETTECOLOR = convertPALETTECOLOR;

}(cornerstoneWADOImageLoader));
/**
 */
(function (cornerstoneWADOImageLoader) {

    "use strict";

    function convertRGBColorByPixel(imageFrame, rgbaBuffer) {
        if(imageFrame === undefined) {
            throw "decodeRGB: rgbBuffer must not be undefined";
        }
        if(imageFrame.length % 3 !== 0) {
            throw "decodeRGB: rgbBuffer length must be divisible by 3";
        }

        var numPixels = imageFrame.length / 3;
        var rgbIndex = 0;
        var rgbaIndex = 0;
        for(var i= 0; i < numPixels; i++) {
            rgbaBuffer[rgbaIndex++] = imageFrame[rgbIndex++]; // red
            rgbaBuffer[rgbaIndex++] = imageFrame[rgbIndex++]; // green
            rgbaBuffer[rgbaIndex++] = imageFrame[rgbIndex++]; // blue
            rgbaBuffer[rgbaIndex++] = 255; //alpha
        }
    }

    // module exports
    cornerstoneWADOImageLoader.convertRGBColorByPixel = convertRGBColorByPixel;
}(cornerstoneWADOImageLoader));
/**
 */
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function convertRGBColorByPlane(imageFrame, rgbaBuffer) {
    if(imageFrame === undefined) {
      throw "decodeRGB: rgbBuffer must not be undefined";
    }
    if(imageFrame.length % 3 !== 0) {
      throw "decodeRGB: rgbBuffer length must be divisible by 3";
    }

    var numPixels = imageFrame.length / 3;
    var rgbaIndex = 0;
    for(var i= 0; i < numPixels; i++) {
      var rIndex = 0;
      var gIndex = numPixels;
      var bIndex = numPixels*2;
      for(var i= 0; i < numPixels; i++) {
        rgbaBuffer[rgbaIndex++] = imageFrame[rIndex++]; // red
        rgbaBuffer[rgbaIndex++] = imageFrame[gIndex++]; // green
        rgbaBuffer[rgbaIndex++] = imageFrame[bIndex++]; // blue
        rgbaBuffer[rgbaIndex++] = 255; //alpha
      }
    }
  }

  // module exports
  cornerstoneWADOImageLoader.convertRGBColorByPlane = convertRGBColorByPlane;
}(cornerstoneWADOImageLoader));
/**
 */
(function (cornerstoneWADOImageLoader) {

    "use strict";

    function convertYBRFull(imageFrame, rgbaBuffer) {
        if(imageFrame === undefined) {
            throw "decodeRGB: ybrBuffer must not be undefined";
        }
        if(imageFrame.length % 3 !== 0) {
            throw "decodeRGB: ybrBuffer length must be divisble by 3";
        }

        var numPixels = imageFrame.length / 3;
        var ybrIndex = 0;
        var rgbaIndex = 0;
        for(var i= 0; i < numPixels; i++) {
            var y = imageFrame[ybrIndex++];
            var cb = imageFrame[ybrIndex++];
            var cr = imageFrame[ybrIndex++];
            rgbaBuffer[rgbaIndex++] = y + 1.40200 * (cr - 128);// red
            rgbaBuffer[rgbaIndex++] = y - 0.34414 * (cb -128) - 0.71414 * (cr- 128); // green
            rgbaBuffer[rgbaIndex++] = y + 1.77200 * (cb - 128); // blue
            rgbaBuffer[rgbaIndex++] = 255; //alpha
        }
    }

    // module exports
    cornerstoneWADOImageLoader.convertYBRFull = convertYBRFull;
}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function configure(options) {
    cornerstoneWADOImageLoader.internal.options = options;
  }

  // module exports
  cornerstoneWADOImageLoader.configure = configure;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function createImageObject(imageId, imgData, frame) {
    if(frame === undefined) {
      frame = 0;
    }

    // make the image based on whether it is color or not
    var isColor = cornerstoneWADOImageLoader.isColorImage(imgData.photometricInterpretation);
    if(isColor === false) {
      return cornerstoneWADOImageLoader.makeGrayscaleImage(imageId, imgData);
    } else {
      return cornerstoneWADOImageLoader.makeColorImage(imageId, imgData);
    }
  }

  // module exports
  cornerstoneWADOImageLoader.createImageObject = createImageObject;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";
  function decodeJPEG2000(imgData, frame)
  {
    var jpxImage = new JpxImage();
    jpxImage.parse(new Uint8Array(imgData.buffer));

    var j2kWidth = jpxImage.width;
    var j2kHeight = jpxImage.height;
    if(j2kWidth !== imgData.width) {
      throw 'JPEG2000 decoder returned width of ' + j2kWidth + ', when ' + imgData.width + ' is expected';
    }
    if(j2kHeight !== imgData.height) {
      throw 'JPEG2000 decoder returned width of ' + j2kHeight + ', when ' + imgData.height + ' is expected';
    }
    var tileCount = jpxImage.tiles.length;
    if(tileCount !== 1) {
      throw 'JPEG2000 decoder returned a tileCount of ' + tileCount + ', when 1 is expected';
    }
    var tileComponents = jpxImage.tiles[0];
    var pixelData = tileComponents.items;
    return pixelData;
  }

  cornerstoneWADOImageLoader.decodeJPEG2000 = decodeJPEG2000;
}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";
  function decodeJPEGBaseline(imgData, frame)
  {
    /* TODO probably a func on imgData
      var frameData = dicomParser.readEncapsulatedPixelData(dataSet, pixelDataElement, frame);
    */
    var frameData = new Uint8Array(imgData.buffer);
   
    var jpeg = new JpegImage();
    jpeg.parse( frameData );
    if(imgData.bitsAllocated === 8) {
      return jpeg.getData(imgData.width, imgData.height);
    }
    else if(imgData.bitsAllocated === 16) {
      return jpeg.getData16(imgData.width, imgData.height);
    }
  }

  cornerstoneWADOImageLoader.decodeJPEGBaseline = decodeJPEGBaseline;
}(cornerstoneWADOImageLoader));
/**
 * Special decoder for 8 bit jpeg that leverages the browser's built in JPEG decoder for increased performance
 */
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function arrayBufferToString(buffer) {
    return binaryToString(String.fromCharCode.apply(null, Array.prototype.slice.apply(new Uint8Array(buffer))));
  }

  function binaryToString(binary) {
    var error;

    try {
      return decodeURIComponent(escape(binary));
    } catch (_error) {
      error = _error;
      if (error instanceof URIError) {
        return binary;
      } else {
        throw error;
      }
    }
  }

  function decodeJPEGBaseline8Bit(canvas, dataSet, frame) {
   return new Promise(function(resolve, reject){

      var height = dataSet.uint16('x00280010');
      var width = dataSet.uint16('x00280011');
      // resize the canvas
      canvas.height = height;
      canvas.width = width;

      var encodedPixelData = dicomParser.readEncapsulatedPixelData(dataSet, dataSet.elements.x7fe00010, frame);

      var imgBlob = new Blob([encodedPixelData], {type: "image/jpeg"});

      var r = new FileReader();
      if(r.readAsBinaryString === undefined) {
        r.readAsArrayBuffer(imgBlob);
      }
      else {
        r.readAsBinaryString(imgBlob); // doesn't work on IE11
      }

      r.onload = function(){
        var img=new Image();
        img.onload = function() {
          var context = canvas.getContext('2d');
          context.drawImage(this, 0, 0);
          var imageData = context.getImageData(0, 0, width, height);
          resolve(imageData);
        };
        img.onerror = function(error) {
          reject(error);
        };
        if(r.readAsBinaryString === undefined) {
          img.src = "data:image/jpeg;base64,"+window.btoa(arrayBufferToString(r.result));
        }
        else {
          img.src = "data:image/jpeg;base64,"+window.btoa(r.result); // doesn't work on IE11
        }

      };
    });
  }

  function isJPEGBaseline8Bit(imgObj) {
   return (imgObj.bitsAllocated === 8) &&
      imgObj.transferSyntax === "1.2.840.10008.1.2.4.50";
  }

  // module exports
  cornerstoneWADOImageLoader.decodeJPEGBaseline8Bit = decodeJPEGBaseline8Bit;
  cornerstoneWADOImageLoader.isJPEGBaseline8Bit = isJPEGBaseline8Bit;

}(cornerstoneWADOImageLoader));

(function (cornerstoneWADOImageLoader) {

  function decodeJPEGLossless(dataSet, frame) {
    var pixelDataElement = dataSet.elements.x7fe00010;
    var bitsAllocated = dataSet.uint16('x00280100');
    var pixelRepresentation = dataSet.uint16('x00280103');
    var frameData = dicomParser.readEncapsulatedPixelData(dataSet, pixelDataElement, frame);
    var byteOutput = bitsAllocated <= 8 ? 1 : 2;
    //console.time('jpeglossless');
    var decoder = new jpeg.lossless.Decoder();
    var decompressedData = decoder.decode(frameData.buffer, frameData.byteOffset, frameData.length, byteOutput);
    //console.timeEnd('jpeglossless');
    if (pixelRepresentation === 0) {
      if (byteOutput === 2) {
        return new Uint16Array(decompressedData.buffer);
      } else {
        // untested!
        return new Uint8Array(decompressedData.buffer);
      }
    } else {
      return new Int16Array(decompressedData.buffer);
    }
  }
  // module exports
  cornerstoneWADOImageLoader.decodeJPEGLossless = decodeJPEGLossless;

}(cornerstoneWADOImageLoader));
/**
 */
(function (cornerstoneWADOImageLoader) {

  function decodeRLE(dataSet, frame) {
    var height = dataSet.uint16('x00280010');
    var width = dataSet.uint16('x00280011');
    var samplesPerPixel = dataSet.uint16('x00280002');
    var pixelDataElement = dataSet.elements.x7fe00010;

    var frameData = dicomParser.readEncapsulatedPixelData(dataSet, pixelDataElement, frame);
    var pixelFormat = cornerstoneWADOImageLoader.getPixelFormat(dataSet);


    var frameSize = width*height;
    var buffer;
    if( pixelFormat===1 ) {
      buffer = new ArrayBuffer(frameSize*samplesPerPixel);
      decode8( frameData, buffer, frameSize, samplesPerPixel);
      return new Uint8Array(buffer);
    } else if( pixelFormat===2 ) {
      buffer = new ArrayBuffer(frameSize*samplesPerPixel*2);
      decode16( frameData, buffer, frameSize );
      return new Uint16Array(buffer);
    } else if( pixelFormat===3 ) {
      buffer = new ArrayBuffer(frameSize*samplesPerPixel*2);
      decode16( frameData, buffer, frameSize );
      return new Int16Array(buffer);
    }
  }

  function decode8( frameData, outFrame, frameSize, samplesSize ) {
    var header=new DataView(frameData.buffer, frameData.byteOffset);
    var data=new DataView( frameData.buffer, frameData.byteOffset );
    var out=new DataView( outFrame );

    var outIndex=0;
    var numSegments = header.getInt32(0,true);
    for( var s=0 ; s < numSegments ; ++s ) {
      outIndex = s;

      var inIndex=header.getInt32( (s+1)*4,true);
      var maxIndex=header.getInt32( (s+2)*4,true);
      if( maxIndex===0 )
        maxIndex = frameData.length;

      var endOfSegment = frameSize * numSegments;

      while( inIndex < maxIndex ) {
        var n=data.getInt8(inIndex++);
        if( n >=0 && n <=127 ) {
          // copy n bytes
          for( var i=0 ; i < n+1 && outIndex < endOfSegment; ++i ) {
            out.setInt8(outIndex, data.getInt8(inIndex++));
            outIndex+=samplesSize;
          }
        } else if( n<= -1 && n>=-127 ) {
          var value=data.getInt8(inIndex++);
          // run of n bytes
          for( var j=0 ; j < -n+1 && outIndex < endOfSegment; ++j ) {
            out.setInt8(outIndex, value );
            outIndex+=samplesSize;
          }
        } 
        /* else if (n===-128){
          // do nothing
        }
        */
      }
    }
  }

  function decode16( frameData, outFrame, frameSize ) {
    var header=new DataView(frameData.buffer, frameData.byteOffset);
    var data=new DataView( frameData.buffer, frameData.byteOffset );
    var out=new DataView( outFrame );

    var numSegments = header.getInt32(0,true);
    for( var s=0 ; s < numSegments ; ++s ) {
      var outIndex=0;
      var highByte=( s===0 ? 1 : 0);

      var inIndex=header.getInt32( (s+1)*4,true);
      var maxIndex=header.getInt32( (s+2)*4,true);
      if( maxIndex===0 )
        maxIndex = frameData.length;

      while( inIndex < maxIndex ) {
        var n=data.getInt8(inIndex++);
        if( n >=0 && n <=127 ) {
          for( var i=0 ; i < n+1 && outIndex < frameSize ; ++i ) {
            out.setInt8( (outIndex*2)+highByte, data.getInt8(inIndex++) );
            outIndex++;
          }
        } else if( n<= -1 && n>=-127 ) {
          var value=data.getInt8(inIndex++);
          for( var j=0 ; j < -n+1 && outIndex < frameSize ; ++j ) {
            out.setInt8( (outIndex*2)+highByte, value );
            outIndex++;
          }
        }
        /*
        else if (n===-128){
          // do nothing
        }
        */
      }
    }
  }

  // module exports
  cornerstoneWADOImageLoader.decodeRLE = decodeRLE;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function decodeTransferSyntax(imgData, frame) {
    var transferSyntax = imgData.transferSyntax;

        // Implicit VR Little Endian
    if( transferSyntax === "1.2.840.10008.1.2" || 
        // Explicit VR Little Endian
         transferSyntax === "1.2.840.10008.1.2.1")
      return cornerstoneWADOImageLoader.extractUncompressedPixels(imgData, frame);
    
            // JPEG 2000 Lossless
    else if(transferSyntax === "1.2.840.10008.1.2.4.90" || 
            // JPEG 2000 Lossy
            transferSyntax === "1.2.840.10008.1.2.4.91")
      return cornerstoneWADOImageLoader.decodeJPEG2000(imgData, frame);
  
    /* Don't know if these work...
    // JPEG 2000 Part 2 Multicomponent Image Compression (Lossless Only)
    else if(transferSyntax === "1.2.840.10008.1.2.4.92")
    {
      return cornerstoneWADOImageLoader.decodeJPEG2000(dataSet, frame);
    }
    // JPEG 2000 Part 2 Multicomponent Image Compression
    else if(transferSyntax === "1.2.840.10008.1.2.4.93")
    {
      return cornerstoneWADOImageLoader.decodeJPEG2000(dataSet, frame);
    }
    */
    // RLE Lossless
    else if ( transferSyntax === "1.2.840.10008.1.2.5" )
      return cornerstoneWADOImageLoader.decodeRLE( imgData, frame);
              // JPEG Baseline lossy process 1 (8 bit)
    else if ( transferSyntax === "1.2.840.10008.1.2.4.50" ||
              // JPEG Baseline lossy process 2 & 4 (12 bit)
              transferSyntax === "1.2.840.10008.1.2.4.51")
      return cornerstoneWADOImageLoader.decodeJPEGBaseline(imgData, frame);
    
    

              // JPEG Lossless, Nonhierarchical (Processes 14)
    else if ( transferSyntax === "1.2.840.10008.1.2.4.57" ||
              // JPEG Lossless, Nonhierarchical (Processes 14 [Selection 1])
              transferSyntax === "1.2.840.10008.1.2.4.70" )
      return cornerstoneWADOImageLoader.decodeJPEGLossless(imgData, frame);
    
    else
      throw "no decoder for transfer syntax " + transferSyntax;
  }

  // module exports
  cornerstoneWADOImageLoader.decodeTransferSyntax = decodeTransferSyntax;

}(cornerstoneWADOImageLoader));
// jshint ignore: start

/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
 /* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/*
 Copyright 2011 notmasteryet

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

// - The JPEG specification can be found in the ITU CCITT Recommendation T.81
//   (www.w3.org/Graphics/JPEG/itu-t81.pdf)
// - The JFIF specification can be found in the JPEG File Interchange Format
//   (www.w3.org/Graphics/JPEG/jfif3.pdf)
// - The Adobe Application-Specific JPEG markers in the Supporting the DCT Filters
//   in PostScript Level 2, Technical Note #5116
//   (partners.adobe.com/public/developer/en/ps/sdk/5116.DCT_Filter.pdf)

var ColorSpace = {Unkown: 0, Grayscale: 1, AdobeRGB: 2, RGB: 3, CYMK: 4};
var JpegImage = (function jpegImage() {
  "use strict";
  var dctZigZag = new Int32Array([
    0,
    1, 8,
    16, 9, 2,
    3, 10, 17, 24,
    32, 25, 18, 11, 4,
    5, 12, 19, 26, 33, 40,
    48, 41, 34, 27, 20, 13, 6,
    7, 14, 21, 28, 35, 42, 49, 56,
    57, 50, 43, 36, 29, 22, 15,
    23, 30, 37, 44, 51, 58,
    59, 52, 45, 38, 31,
    39, 46, 53, 60,
    61, 54, 47,
    55, 62,
    63
  ]);

  var dctCos1 = 4017;   // cos(pi/16)
  var dctSin1 = 799;   // sin(pi/16)
  var dctCos3 = 3406;   // cos(3*pi/16)
  var dctSin3 = 2276;   // sin(3*pi/16)
  var dctCos6 = 1567;   // cos(6*pi/16)
  var dctSin6 = 3784;   // sin(6*pi/16)
  var dctSqrt2 = 5793;   // sqrt(2)
  var dctSqrt1d2 = 2896;  // sqrt(2) / 2

  function constructor() {
  }

  function buildHuffmanTable(codeLengths, values) {
    var k = 0, code = [], i, j, length = 16;
    while (length > 0 && !codeLengths[length - 1])
      length--;
    code.push({children: [], index: 0});
    var p = code[0], q;
    for (i = 0; i < length; i++) {
      for (j = 0; j < codeLengths[i]; j++) {
        p = code.pop();
        p.children[p.index] = values[k];
        while (p.index > 0) {
          p = code.pop();
        }
        p.index++;
        code.push(p);
        while (code.length <= i) {
          code.push(q = {children: [], index: 0});
          p.children[p.index] = q.children;
          p = q;
        }
        k++;
      }
      if (i + 1 < length) {
        // p here points to last code
        code.push(q = {children: [], index: 0});
        p.children[p.index] = q.children;
        p = q;
      }
    }
    return code[0].children;
  }

  function getBlockBufferOffset(component, row, col) {
    return 64 * ((component.blocksPerLine + 1) * row + col);
  }

  function decodeScan(data, offset,
                      frame, components, resetInterval,
                      spectralStart, spectralEnd,
                      successivePrev, successive) {
    var precision = frame.precision;
    var samplesPerLine = frame.samplesPerLine;
    var scanLines = frame.scanLines;
    var mcusPerLine = frame.mcusPerLine;
    var progressive = frame.progressive;
    var maxH = frame.maxH, maxV = frame.maxV;

    var startOffset = offset, bitsData = 0, bitsCount = 0;

    function readBit() {
      if (bitsCount > 0) {
        bitsCount--;
        return (bitsData >> bitsCount) & 1;
      }
      bitsData = data[offset++];
      if (bitsData == 0xFF) {
        var nextByte = data[offset++];
        if (nextByte) {
          throw "unexpected marker: " + ((bitsData << 8) | nextByte).toString(16);
        }
        // unstuff 0
      }
      bitsCount = 7;
      return bitsData >>> 7;
    }

    function decodeHuffman(tree) {
      var node = tree;
      var bit;
      while ((bit = readBit()) !== null) {
        node = node[bit];
        if (typeof node === 'number')
          return node;
        if (typeof node !== 'object')
          throw "invalid huffman sequence";
      }
      return null;
    }

    function receive(length) {
      var n = 0;
      while (length > 0) {
        var bit = readBit();
        if (bit === null)
          return;
        n = (n << 1) | bit;
        length--;
      }
      return n;
    }

    function receiveAndExtend(length) {
      var n = receive(length);
      if (n >= 1 << (length - 1))
        return n;
      return n + (-1 << length) + 1;
    }

    function decodeBaseline(component, offset) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : receiveAndExtend(t);
      component.blockData[offset] = (component.pred += diff);
      var k = 1;
      while (k < 64) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15)
            break;
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        component.blockData[offset + z] = receiveAndExtend(s);
        k++;
      }
    }

    function decodeDCFirst(component, offset) {
      var t = decodeHuffman(component.huffmanTableDC);
      var diff = t === 0 ? 0 : (receiveAndExtend(t) << successive);
      component.blockData[offset] = (component.pred += diff);
    }

    function decodeDCSuccessive(component, offset) {
      component.blockData[offset] |= readBit() << successive;
    }

    var eobrun = 0;
    function decodeACFirst(component, offset) {
      if (eobrun > 0) {
        eobrun--;
        return;
      }
      var k = spectralStart, e = spectralEnd;
      while (k <= e) {
        var rs = decodeHuffman(component.huffmanTableAC);
        var s = rs & 15, r = rs >> 4;
        if (s === 0) {
          if (r < 15) {
            eobrun = receive(r) + (1 << r) - 1;
            break;
          }
          k += 16;
          continue;
        }
        k += r;
        var z = dctZigZag[k];
        component.blockData[offset + z] = receiveAndExtend(s) * (1 << successive);
        k++;
      }
    }

    var successiveACState = 0, successiveACNextValue;
    function decodeACSuccessive(component, offset) {
      var k = spectralStart, e = spectralEnd, r = 0;
      while (k <= e) {
        var z = dctZigZag[k];
        switch (successiveACState) {
          case 0: // initial state
            var rs = decodeHuffman(component.huffmanTableAC);
            var s = rs & 15;
            r = rs >> 4;
            if (s === 0) {
              if (r < 15) {
                eobrun = receive(r) + (1 << r);
                successiveACState = 4;
              } else {
                r = 16;
                successiveACState = 1;
              }
            } else {
              if (s !== 1)
                throw "invalid ACn encoding";
              successiveACNextValue = receiveAndExtend(s);
              successiveACState = r ? 2 : 3;
            }
            continue;
          case 1: // skipping r zero items
          case 2:
            if (component.blockData[offset + z]) {
              component.blockData[offset + z] += (readBit() << successive);
            } else {
              r--;
              if (r === 0)
                successiveACState = successiveACState == 2 ? 3 : 0;
            }
            break;
          case 3: // set value for a zero item
            if (component.blockData[offset + z]) {
              component.blockData[offset + z] += (readBit() << successive);
            } else {
              component.blockData[offset + z] = successiveACNextValue << successive;
              successiveACState = 0;
            }
            break;
          case 4: // eob
            if (component.blockData[offset + z]) {
              component.blockData[offset + z] += (readBit() << successive);
            }
            break;
        }
        k++;
      }
      if (successiveACState === 4) {
        eobrun--;
        if (eobrun === 0)
          successiveACState = 0;
      }
    }

    function decodeMcu(component, decode, mcu, row, col) {
      var mcuRow = (mcu / mcusPerLine) | 0;
      var mcuCol = mcu % mcusPerLine;
      var blockRow = mcuRow * component.v + row;
      var blockCol = mcuCol * component.h + col;
      var offset = getBlockBufferOffset(component, blockRow, blockCol);
      decode(component, offset);
    }

    function decodeBlock(component, decode, mcu) {
      var blockRow = (mcu / component.blocksPerLine) | 0;
      var blockCol = mcu % component.blocksPerLine;
      var offset = getBlockBufferOffset(component, blockRow, blockCol);
      decode(component, offset);
    }

    var componentsLength = components.length;
    var component, i, j, k, n;
    var decodeFn;
    if (progressive) {
      if (spectralStart === 0)
        decodeFn = successivePrev === 0 ? decodeDCFirst : decodeDCSuccessive;
      else
        decodeFn = successivePrev === 0 ? decodeACFirst : decodeACSuccessive;
    } else {
      decodeFn = decodeBaseline;
    }

    var mcu = 0, marker;
    var mcuExpected;
    if (componentsLength == 1) {
      mcuExpected = components[0].blocksPerLine * components[0].blocksPerColumn;
    } else {
      mcuExpected = mcusPerLine * frame.mcusPerColumn;
    }
    if (!resetInterval) {
      resetInterval = mcuExpected;
    }

    var h, v;
    while (mcu < mcuExpected) {
      // reset interval stuff
      for (i = 0; i < componentsLength; i++) {
        components[i].pred = 0;
      }
      eobrun = 0;

      if (componentsLength == 1) {
        component = components[0];
        for (n = 0; n < resetInterval; n++) {
          decodeBlock(component, decodeFn, mcu);
          mcu++;
        }
      } else {
        for (n = 0; n < resetInterval; n++) {
          for (i = 0; i < componentsLength; i++) {
            component = components[i];
            h = component.h;
            v = component.v;
            for (j = 0; j < v; j++) {
              for (k = 0; k < h; k++) {
                decodeMcu(component, decodeFn, mcu, j, k);
              }
            }
          }
          mcu++;
        }
      }

      // find marker
      bitsCount = 0;
      marker = (data[offset] << 8) | data[offset + 1];
      if (marker <= 0xFF00) {
        throw "marker was not found";
      }

      if (marker >= 0xFFD0 && marker <= 0xFFD7) { // RSTx
        offset += 2;
      } else {
        break;
      }
    }

    return offset - startOffset;
  }

  // A port of poppler's IDCT method which in turn is taken from:
  //   Christoph Loeffler, Adriaan Ligtenberg, George S. Moschytz,
  //   "Practical Fast 1-D DCT Algorithms with 11 Multiplications",
  //   IEEE Intl. Conf. on Acoustics, Speech & Signal Processing, 1989,
  //   988-991.
  function quantizeAndInverse(component, blockBufferOffset, p) {
    var qt = component.quantizationTable;
    var v0, v1, v2, v3, v4, v5, v6, v7, t;
    var i;

    // dequant
    for (i = 0; i < 64; i++) {
      p[i] = component.blockData[blockBufferOffset + i] * qt[i];
    }

    // inverse DCT on rows
    for (i = 0; i < 8; ++i) {
      var row = 8 * i;

      // check for all-zero AC coefficients
      if (p[1 + row] === 0 && p[2 + row] === 0 && p[3 + row] === 0 &&
        p[4 + row] === 0 && p[5 + row] === 0 && p[6 + row] === 0 &&
        p[7 + row] === 0) {
        t = (dctSqrt2 * p[0 + row] + 512) >> 10;
        p[0 + row] = t;
        p[1 + row] = t;
        p[2 + row] = t;
        p[3 + row] = t;
        p[4 + row] = t;
        p[5 + row] = t;
        p[6 + row] = t;
        p[7 + row] = t;
        continue;
      }

      // stage 4
      v0 = (dctSqrt2 * p[0 + row] + 128) >> 8;
      v1 = (dctSqrt2 * p[4 + row] + 128) >> 8;
      v2 = p[2 + row];
      v3 = p[6 + row];
      v4 = (dctSqrt1d2 * (p[1 + row] - p[7 + row]) + 128) >> 8;
      v7 = (dctSqrt1d2 * (p[1 + row] + p[7 + row]) + 128) >> 8;
      v5 = p[3 + row] << 4;
      v6 = p[5 + row] << 4;

      // stage 3
      t = (v0 - v1 + 1) >> 1;
      v0 = (v0 + v1 + 1) >> 1;
      v1 = t;
      t = (v2 * dctSin6 + v3 * dctCos6 + 128) >> 8;
      v2 = (v2 * dctCos6 - v3 * dctSin6 + 128) >> 8;
      v3 = t;
      t = (v4 - v6 + 1) >> 1;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = t;
      t = (v7 + v5 + 1) >> 1;
      v5 = (v7 - v5 + 1) >> 1;
      v7 = t;

      // stage 2
      t = (v0 - v3 + 1) >> 1;
      v0 = (v0 + v3 + 1) >> 1;
      v3 = t;
      t = (v1 - v2 + 1) >> 1;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = t;
      t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
      v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
      v7 = t;
      t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
      v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p[0 + row] = v0 + v7;
      p[7 + row] = v0 - v7;
      p[1 + row] = v1 + v6;
      p[6 + row] = v1 - v6;
      p[2 + row] = v2 + v5;
      p[5 + row] = v2 - v5;
      p[3 + row] = v3 + v4;
      p[4 + row] = v3 - v4;
    }

    // inverse DCT on columns
    for (i = 0; i < 8; ++i) {
      var col = i;

      // check for all-zero AC coefficients
      if (p[1 * 8 + col] === 0 && p[2 * 8 + col] === 0 && p[3 * 8 + col] === 0 &&
        p[4 * 8 + col] === 0 && p[5 * 8 + col] === 0 && p[6 * 8 + col] === 0 &&
        p[7 * 8 + col] === 0) {
        t = (dctSqrt2 * p[i + 0] + 8192) >> 14;
        p[0 * 8 + col] = t;
        p[1 * 8 + col] = t;
        p[2 * 8 + col] = t;
        p[3 * 8 + col] = t;
        p[4 * 8 + col] = t;
        p[5 * 8 + col] = t;
        p[6 * 8 + col] = t;
        p[7 * 8 + col] = t;
        continue;
      }

      // stage 4
      v0 = (dctSqrt2 * p[0 * 8 + col] + 2048) >> 12;
      v1 = (dctSqrt2 * p[4 * 8 + col] + 2048) >> 12;
      v2 = p[2 * 8 + col];
      v3 = p[6 * 8 + col];
      v4 = (dctSqrt1d2 * (p[1 * 8 + col] - p[7 * 8 + col]) + 2048) >> 12;
      v7 = (dctSqrt1d2 * (p[1 * 8 + col] + p[7 * 8 + col]) + 2048) >> 12;
      v5 = p[3 * 8 + col];
      v6 = p[5 * 8 + col];

      // stage 3
      t = (v0 - v1 + 1) >> 1;
      v0 = (v0 + v1 + 1) >> 1;
      v1 = t;
      t = (v2 * dctSin6 + v3 * dctCos6 + 2048) >> 12;
      v2 = (v2 * dctCos6 - v3 * dctSin6 + 2048) >> 12;
      v3 = t;
      t = (v4 - v6 + 1) >> 1;
      v4 = (v4 + v6 + 1) >> 1;
      v6 = t;
      t = (v7 + v5 + 1) >> 1;
      v5 = (v7 - v5 + 1) >> 1;
      v7 = t;

      // stage 2
      t = (v0 - v3 + 1) >> 1;
      v0 = (v0 + v3 + 1) >> 1;
      v3 = t;
      t = (v1 - v2 + 1) >> 1;
      v1 = (v1 + v2 + 1) >> 1;
      v2 = t;
      t = (v4 * dctSin3 + v7 * dctCos3 + 2048) >> 12;
      v4 = (v4 * dctCos3 - v7 * dctSin3 + 2048) >> 12;
      v7 = t;
      t = (v5 * dctSin1 + v6 * dctCos1 + 2048) >> 12;
      v5 = (v5 * dctCos1 - v6 * dctSin1 + 2048) >> 12;
      v6 = t;

      // stage 1
      p[0 * 8 + col] = v0 + v7;
      p[7 * 8 + col] = v0 - v7;
      p[1 * 8 + col] = v1 + v6;
      p[6 * 8 + col] = v1 - v6;
      p[2 * 8 + col] = v2 + v5;
      p[5 * 8 + col] = v2 - v5;
      p[3 * 8 + col] = v3 + v4;
      p[4 * 8 + col] = v3 - v4;
    }

    // convert to 8-bit integers
    for (i = 0; i < 64; ++i) {
      var index = blockBufferOffset + i;
      var q = p[i];
      q = (q <= -2056 / component.bitConversion) ? 0 :
        (q >= 2024 / component.bitConversion) ? 255 / component.bitConversion :
        (q + 2056 / component.bitConversion) >> 4;
      component.blockData[index] = q;
    }
  }

  function buildComponentData(frame, component) {
    var lines = [];
    var blocksPerLine = component.blocksPerLine;
    var blocksPerColumn = component.blocksPerColumn;
    var samplesPerLine = blocksPerLine << 3;
    var computationBuffer = new Int32Array(64);

    var i, j, ll = 0;
    for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
      for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
        var offset = getBlockBufferOffset(component, blockRow, blockCol);
        quantizeAndInverse(component, offset, computationBuffer);
      }
    }
    return component.blockData;
  }

  function clampToUint8(a) {
    return a <= 0 ? 0 : a >= 255 ? 255 : a | 0;
  }

  constructor.prototype = {
    load: function load(path) {
      var handleData = (function (data) {
        this.parse(data);
        if (this.onload)
          this.onload();
      }).bind(this);

      if (path.indexOf("data:") > -1) {
        var offset = path.indexOf("base64,") + 7;
        var data = atob(path.substring(offset));
        var arr = new Uint8Array(data.length);
        for (var i = data.length - 1; i >= 0; i--) {
          arr[i] = data.charCodeAt(i);
        }
        handleData(data);
      } else {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", path, true);
        xhr.responseType = "arraybuffer";
        xhr.onload = (function () {
          // TODO catch parse error
          var data = new Uint8Array(xhr.response);
          handleData(data);
        }).bind(this);
        xhr.send(null);
      }
    },
    parse: function parse(data) {

      function readUint16() {
        var value = (data[offset] << 8) | data[offset + 1];
        offset += 2;
        return value;
      }

      function readDataBlock() {
        var length = readUint16();
        var array = data.subarray(offset, offset + length - 2);
        offset += array.length;
        return array;
      }

      function prepareComponents(frame) {
        var mcusPerLine = Math.ceil(frame.samplesPerLine / 8 / frame.maxH);
        var mcusPerColumn = Math.ceil(frame.scanLines / 8 / frame.maxV);
        for (var i = 0; i < frame.components.length; i++) {
          component = frame.components[i];
          var blocksPerLine = Math.ceil(Math.ceil(frame.samplesPerLine / 8) * component.h / frame.maxH);
          var blocksPerColumn = Math.ceil(Math.ceil(frame.scanLines / 8) * component.v / frame.maxV);
          var blocksPerLineForMcu = mcusPerLine * component.h;
          var blocksPerColumnForMcu = mcusPerColumn * component.v;

          var blocksBufferSize = 64 * blocksPerColumnForMcu * (blocksPerLineForMcu + 1);
          component.blockData = new Int16Array(blocksBufferSize);
          component.blocksPerLine = blocksPerLine;
          component.blocksPerColumn = blocksPerColumn;
        }
        frame.mcusPerLine = mcusPerLine;
        frame.mcusPerColumn = mcusPerColumn;
      }

      var offset = 0, length = data.length;
      var jfif = null;
      var adobe = null;
      var pixels = null;
      var frame, resetInterval;
      var quantizationTables = [];
      var huffmanTablesAC = [], huffmanTablesDC = [];
      var fileMarker = readUint16();
      if (fileMarker != 0xFFD8) { // SOI (Start of Image)
        throw "SOI not found";
      }

      fileMarker = readUint16();
      while (fileMarker != 0xFFD9) { // EOI (End of image)
        var i, j, l;
        switch (fileMarker) {
          case 0xFFE0: // APP0 (Application Specific)
          case 0xFFE1: // APP1
          case 0xFFE2: // APP2
          case 0xFFE3: // APP3
          case 0xFFE4: // APP4
          case 0xFFE5: // APP5
          case 0xFFE6: // APP6
          case 0xFFE7: // APP7
          case 0xFFE8: // APP8
          case 0xFFE9: // APP9
          case 0xFFEA: // APP10
          case 0xFFEB: // APP11
          case 0xFFEC: // APP12
          case 0xFFED: // APP13
          case 0xFFEE: // APP14
          case 0xFFEF: // APP15
          case 0xFFFE: // COM (Comment)
            var appData = readDataBlock();

            if (fileMarker === 0xFFE0) {
              if (appData[0] === 0x4A && appData[1] === 0x46 && appData[2] === 0x49 &&
                appData[3] === 0x46 && appData[4] === 0) { // 'JFIF\x00'
                jfif = {
                  version: {major: appData[5], minor: appData[6]},
                  densityUnits: appData[7],
                  xDensity: (appData[8] << 8) | appData[9],
                  yDensity: (appData[10] << 8) | appData[11],
                  thumbWidth: appData[12],
                  thumbHeight: appData[13],
                  thumbData: appData.subarray(14, 14 + 3 * appData[12] * appData[13])
                };
              }
            }
            // TODO APP1 - Exif
            if (fileMarker === 0xFFEE) {
              if (appData[0] === 0x41 && appData[1] === 0x64 && appData[2] === 0x6F &&
                appData[3] === 0x62 && appData[4] === 0x65 && appData[5] === 0) { // 'Adobe\x00'
                adobe = {
                  version: appData[6],
                  flags0: (appData[7] << 8) | appData[8],
                  flags1: (appData[9] << 8) | appData[10],
                  transformCode: appData[11]
                };
              }
            }
            break;

          case 0xFFDB: // DQT (Define Quantization Tables)
            var quantizationTablesLength = readUint16();
            var quantizationTablesEnd = quantizationTablesLength + offset - 2;
            while (offset < quantizationTablesEnd) {
              var quantizationTableSpec = data[offset++];
              var tableData = new Int32Array(64);
              if ((quantizationTableSpec >> 4) === 0) { // 8 bit values
                for (j = 0; j < 64; j++) {
                  var z = dctZigZag[j];
                  tableData[z] = data[offset++];
                }
              } else if ((quantizationTableSpec >> 4) === 1) { //16 bit
                for (j = 0; j < 64; j++) {
                  var zz = dctZigZag[j];
                  tableData[zz] = readUint16();
                }
              } else
                throw "DQT: invalid table spec";
              quantizationTables[quantizationTableSpec & 15] = tableData;
            }
            break;

          case 0xFFC0: // SOF0 (Start of Frame, Baseline DCT)
          case 0xFFC1: // SOF1 (Start of Frame, Extended DCT)
          case 0xFFC2: // SOF2 (Start of Frame, Progressive DCT)
            if (frame) {
              throw "Only single frame JPEGs supported";
            }
            readUint16(); // skip data length
            frame = {};
            frame.extended = (fileMarker === 0xFFC1);
            frame.progressive = (fileMarker === 0xFFC2);
            frame.precision = data[offset++];
            frame.scanLines = readUint16();
            frame.samplesPerLine = readUint16();
            frame.components = [];
            frame.componentIds = {};
            var componentsCount = data[offset++], componentId;
            var maxH = 0, maxV = 0;
            for (i = 0; i < componentsCount; i++) {
              componentId = data[offset];
              var h = data[offset + 1] >> 4;
              var v = data[offset + 1] & 15;
              if (maxH < h)
                maxH = h;
              if (maxV < v)
                maxV = v;
              var qId = data[offset + 2];
              l = frame.components.push({
                h: h,
                v: v,
                quantizationTable: quantizationTables[qId],
                quantizationTableId: qId,
                bitConversion: 255 / ((1 << frame.precision) - 1)
              });
              frame.componentIds[componentId] = l - 1;
              offset += 3;
            }
            frame.maxH = maxH;
            frame.maxV = maxV;
            prepareComponents(frame);
            break;

          case 0xFFC4: // DHT (Define Huffman Tables)
            var huffmanLength = readUint16();
            for (i = 2; i < huffmanLength; ) {
              var huffmanTableSpec = data[offset++];
              var codeLengths = new Uint8Array(16);
              var codeLengthSum = 0;
              for (j = 0; j < 16; j++, offset++)
                codeLengthSum += (codeLengths[j] = data[offset]);
              var huffmanValues = new Uint8Array(codeLengthSum);
              for (j = 0; j < codeLengthSum; j++, offset++)
                huffmanValues[j] = data[offset];
              i += 17 + codeLengthSum;

              ((huffmanTableSpec >> 4) === 0 ?
                huffmanTablesDC : huffmanTablesAC)[huffmanTableSpec & 15] =
                buildHuffmanTable(codeLengths, huffmanValues);
            }
            break;

          case 0xFFDD: // DRI (Define Restart Interval)
            readUint16(); // skip data length
            resetInterval = readUint16();
            break;

          case 0xFFDA: // SOS (Start of Scan)
            var scanLength = readUint16();
            var selectorsCount = data[offset++];
            var components = [], component;
            for (i = 0; i < selectorsCount; i++) {
              var componentIndex = frame.componentIds[data[offset++]];
              component = frame.components[componentIndex];
              var tableSpec = data[offset++];
              component.huffmanTableDC = huffmanTablesDC[tableSpec >> 4];
              component.huffmanTableAC = huffmanTablesAC[tableSpec & 15];
              components.push(component);
            }
            var spectralStart = data[offset++];
            var spectralEnd = data[offset++];
            var successiveApproximation = data[offset++];
            var processed = decodeScan(data, offset,
              frame, components, resetInterval,
              spectralStart, spectralEnd,
              successiveApproximation >> 4, successiveApproximation & 15);
            offset += processed;
            break;
          default:
            if (data[offset - 3] == 0xFF &&
              data[offset - 2] >= 0xC0 && data[offset - 2] <= 0xFE) {
              // could be incorrect encoding -- last 0xFF byte of the previous
              // block was eaten by the encoder
              offset -= 3;
              break;
            }
            throw "unknown JPEG marker " + fileMarker.toString(16);
        }
        fileMarker = readUint16();
      }

      this.width = frame.samplesPerLine;
      this.height = frame.scanLines;
      this.jfif = jfif;
      this.adobe = adobe;
      this.components = [];
      switch (frame.components.length)
      {
        case 1:
          this.colorspace = ColorSpace.Grayscale;
          break;
        case 3:
          if (this.adobe)
            this.colorspace = ColorSpace.AdobeRGB;
          else
            this.colorspace = ColorSpace.RGB;
          break;
        case 4:
          this.colorspace = ColorSpace.CYMK;
          break;
        default:
          this.colorspace = ColorSpace.Unknown;
      }
      for (var i = 0; i < frame.components.length; i++) {
        var component = frame.components[i];
        if (!component.quantizationTable && component.quantizationTableId !== null)
          component.quantizationTable = quantizationTables[component.quantizationTableId];
        this.components.push({
          output: buildComponentData(frame, component),
          scaleX: component.h / frame.maxH,
          scaleY: component.v / frame.maxV,
          blocksPerLine: component.blocksPerLine,
          blocksPerColumn: component.blocksPerColumn,
          bitConversion: component.bitConversion
        });
      }
    },
    getData16: function getData16(width, height) {
      if (this.components.length !== 1)
        throw 'Unsupported color mode';
      var scaleX = this.width / width, scaleY = this.height / height;

      var component, componentScaleX, componentScaleY;
      var x, y, i;
      var offset = 0;
      var numComponents = this.components.length;
      var dataLength = width * height * numComponents;
      var data = new Uint16Array(dataLength);
      var componentLine;

      // lineData is reused for all components. Assume first component is
      // the biggest
      var lineData = new Uint16Array((this.components[0].blocksPerLine << 3) *
      this.components[0].blocksPerColumn * 8);

      // First construct image data ...
      for (i = 0; i < numComponents; i++) {
        component = this.components[i];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;

        var j, k, ll = 0;
        var lineOffset = 0;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            var bufferOffset = getBlockBufferOffset(component, blockRow, blockCol);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var lineOffset = (scanLine + j) * samplesPerLine;
              for (k = 0; k < 8; k++) {
                lineData[lineOffset + sample + k] =
                  component.output[bufferOffset + offset++];
              }
            }
          }
        }

        componentScaleX = component.scaleX * scaleX;
        componentScaleY = component.scaleY * scaleY;
        offset = i;

        var cx, cy;
        var index;
        for (y = 0; y < height; y++) {
          for (x = 0; x < width; x++) {
            cy = 0 | (y * componentScaleY);
            cx = 0 | (x * componentScaleX);
            index = cy * samplesPerLine + cx;
            data[offset] = lineData[index];
            offset += numComponents;
          }
        }
      }
      return data;
    },
    getData: function getData(width, height) {
      var scaleX = this.width / width, scaleY = this.height / height;

      var component, componentScaleX, componentScaleY;
      var x, y, i;
      var offset = 0;
      var Y, Cb, Cr, K, C, M, Ye, R, G, B;
      var colorTransform;
      var numComponents = this.components.length;
      var dataLength = width * height * numComponents;
      var data = new Uint8Array(dataLength);
      var componentLine;

      // lineData is reused for all components. Assume first component is
      // the biggest
      var lineData = new Uint8Array((this.components[0].blocksPerLine << 3) *
      this.components[0].blocksPerColumn * 8);

      // First construct image data ...
      for (i = 0; i < numComponents; i++) {
        component = this.components[i];
        var blocksPerLine = component.blocksPerLine;
        var blocksPerColumn = component.blocksPerColumn;
        var samplesPerLine = blocksPerLine << 3;

        var j, k, ll = 0;
        var lineOffset = 0;
        for (var blockRow = 0; blockRow < blocksPerColumn; blockRow++) {
          var scanLine = blockRow << 3;
          for (var blockCol = 0; blockCol < blocksPerLine; blockCol++) {
            var bufferOffset = getBlockBufferOffset(component, blockRow, blockCol);
            var offset = 0, sample = blockCol << 3;
            for (j = 0; j < 8; j++) {
              var lineOffset = (scanLine + j) * samplesPerLine;
              for (k = 0; k < 8; k++) {
                lineData[lineOffset + sample + k] =
                  component.output[bufferOffset + offset++] * component.bitConversion;
              }
            }
          }
        }

        componentScaleX = component.scaleX * scaleX;
        componentScaleY = component.scaleY * scaleY;
        offset = i;

        var cx, cy;
        var index;
        for (y = 0; y < height; y++) {
          for (x = 0; x < width; x++) {
            cy = 0 | (y * componentScaleY);
            cx = 0 | (x * componentScaleX);
            index = cy * samplesPerLine + cx;
            data[offset] = lineData[index];
            offset += numComponents;
          }
        }
      }

      // ... then transform colors, if necessary
      switch (numComponents) {
        case 1:
        case 2:
          break;
        // no color conversion for one or two compoenents

        case 3:
          // The default transform for three components is true
          colorTransform = true;
          // The adobe transform marker overrides any previous setting
          if (this.adobe && this.adobe.transformCode)
            colorTransform = true;
          else if (typeof this.colorTransform !== 'undefined')
            colorTransform = !!this.colorTransform;

          if (colorTransform) {
            for (i = 0; i < dataLength; i += numComponents) {
              Y = data[i    ];
              Cb = data[i + 1];
              Cr = data[i + 2];

              R = clampToUint8(Y - 179.456 + 1.402 * Cr);
              G = clampToUint8(Y + 135.459 - 0.344 * Cb - 0.714 * Cr);
              B = clampToUint8(Y - 226.816 + 1.772 * Cb);

              data[i    ] = R;
              data[i + 1] = G;
              data[i + 2] = B;
            }
          }
          break;
        case 4:
          if (!this.adobe)
            throw 'Unsupported color mode (4 components)';
          // The default transform for four components is false
          colorTransform = false;
          // The adobe transform marker overrides any previous setting
          if (this.adobe && this.adobe.transformCode)
            colorTransform = true;
          else if (typeof this.colorTransform !== 'undefined')
            colorTransform = !!this.colorTransform;

          if (colorTransform) {
            for (i = 0; i < dataLength; i += numComponents) {
              Y = data[i];
              Cb = data[i + 1];
              Cr = data[i + 2];

              C = clampToUint8(434.456 - Y - 1.402 * Cr);
              M = clampToUint8(119.541 - Y + 0.344 * Cb + 0.714 * Cr);
              Y = clampToUint8(481.816 - Y - 1.772 * Cb);

              data[i    ] = C;
              data[i + 1] = M;
              data[i + 2] = Y;
              // K is unchanged
            }
          }
          break;
        default:
          throw 'Unsupported color mode';
      }
      return data;
    }
  };

  return constructor;
})();
(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.jpeg = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};


  /*** Constructor ***/
  jpeg.lossless.ComponentSpec = jpeg.lossless.ComponentSpec || function () {
    this.hSamp = 0; // Horizontal sampling factor
    this.quantTableSel = 0; // Quantization table destination selector
    this.vSamp = 0; // Vertical
  };


  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.ComponentSpec;
  }

},{}],2:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};


  /*** Constructor ***/
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || function (data, offset, length) {
    this.buffer = new DataView(data, offset, length);
    this.index = 0;
  };



  jpeg.lossless.DataStream.prototype.get16 = function () {
    var value = this.buffer.getUint16(this.index, false);
    this.index += 2;
    return value;
  };



  jpeg.lossless.DataStream.prototype.get8 = function () {
    var value = this.buffer.getUint8(this.index);
    this.index += 1;
    return value;
  };


  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.DataStream;
  }

},{}],3:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
  jpeg.lossless.HuffmanTable = jpeg.lossless.HuffmanTable || ((typeof require !== 'undefined') ? require('./huffman-table.js') : null);
  jpeg.lossless.QuantizationTable = jpeg.lossless.QuantizationTable || ((typeof require !== 'undefined') ? require('./quantization-table.js') : null);
  jpeg.lossless.ScanHeader = jpeg.lossless.ScanHeader || ((typeof require !== 'undefined') ? require('./scan-header.js') : null);
  jpeg.lossless.FrameHeader = jpeg.lossless.FrameHeader || ((typeof require !== 'undefined') ? require('./frame-header.js') : null);
  jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


  /*** Constructor ***/
  jpeg.lossless.Decoder = jpeg.lossless.Decoder || function (buffer, numBytes) {
    this.buffer = buffer;
    this.frame = new jpeg.lossless.FrameHeader();
    this.huffTable = new jpeg.lossless.HuffmanTable();
    this.quantTable = new jpeg.lossless.QuantizationTable();
    this.scan = new jpeg.lossless.ScanHeader();
    this.DU = jpeg.lossless.Utils.createArray(10, 4, 64); // at most 10 data units in a MCU, at most 4 data units in one component
    this.HuffTab = jpeg.lossless.Utils.createArray(4, 2, 50 * 256);
    this.IDCT_Source = [];
    this.nBlock = []; // number of blocks in the i-th Comp in a scan
    this.acTab = jpeg.lossless.Utils.createArray(10, 1); // ac HuffTab for the i-th Comp in a scan
    this.dcTab = jpeg.lossless.Utils.createArray(10, 1); // dc HuffTab for the i-th Comp in a scan
    this.qTab = jpeg.lossless.Utils.createArray(10, 1); // quantization table for the i-th Comp in a scan
    this.marker = 0;
    this.markerIndex = 0;
    this.numComp = 0;
    this.restartInterval = 0;
    this.selection = 0;
    this.xDim = 0;
    this.yDim = 0;
    this.xLoc = 0;
    this.yLoc = 0;
    this.numBytes = 0;
    this.outputData = null;

    if (typeof numBytes !== "undefined") {
      this.numBytes = numBytes;
    }
  };


  /*** Static Pseudo-constants ***/

  jpeg.lossless.Decoder.IDCT_P = [0, 5, 40, 16, 45, 2, 7, 42, 21, 56, 8, 61, 18, 47, 1, 4, 41, 23, 58, 13, 32, 24, 37, 10, 63, 17, 44, 3, 6, 43, 20,
    57, 15, 34, 29, 48, 53, 26, 39, 9, 60, 19, 46, 22, 59, 12, 33, 31, 50, 55, 25, 36, 11, 62, 14, 35, 28, 49, 52, 27, 38, 30, 51, 54];
  jpeg.lossless.Decoder.TABLE = [0, 1, 5, 6, 14, 15, 27, 28, 2, 4, 7, 13, 16, 26, 29, 42, 3, 8, 12, 17, 25, 30, 41, 43, 9, 11, 18, 24, 31, 40, 44, 53,
    10, 19, 23, 32, 39, 45, 52, 54, 20, 22, 33, 38, 46, 51, 55, 60, 21, 34, 37, 47, 50, 56, 59, 61, 35, 36, 48, 49, 57, 58, 62, 63];
  jpeg.lossless.Decoder.MAX_HUFFMAN_SUBTREE = 50;
  jpeg.lossless.Decoder.MSB = 0x80000000;


  /*** Prototype Methods ***/

  jpeg.lossless.Decoder.prototype.decompress = function (buffer, offset, length) {
    return this.decode(buffer, offset, length).buffer;
  };



  jpeg.lossless.Decoder.prototype.decode = function (buffer, offset, length, numBytes) {
    /*jslint bitwise: true */

    var current, scanNum = 0, pred = [], i, compN, temp = [], index = [], mcuNum;

    if (typeof buffer !== "undefined") {
      this.buffer = buffer;
    }

    if (typeof numBytes !== "undefined") {
      this.numBytes = numBytes;
    }

    this.stream = new jpeg.lossless.DataStream(this.buffer, offset, length);
    this.buffer = null;

    this.xLoc = 0;
    this.yLoc = 0;
    current = this.stream.get16();

    if (current !== 0xFFD8) { // SOI
      throw new Error("Not a JPEG file");
    }

    current = this.stream.get16();

    while ((((current >> 4) !== 0x0FFC) || (current === 0xFFC4))) { // SOF 0~15
      switch (current) {
        case 0xFFC4: // DHT
          this.huffTable.read(this.stream, this.HuffTab);
          break;
        case 0xFFCC: // DAC
          throw new Error("Program doesn't support arithmetic coding. (format throw new IOException)");
        case 0xFFDB:
          this.quantTable.read(this.stream, jpeg.lossless.Decoder.TABLE);
          break;
        case 0xFFDD:
          this.restartInterval = this.readNumber();
          break;
        case 0xFFE0:
        case 0xFFE1:
        case 0xFFE2:
        case 0xFFE3:
        case 0xFFE4:
        case 0xFFE5:
        case 0xFFE6:
        case 0xFFE7:
        case 0xFFE8:
        case 0xFFE9:
        case 0xFFEA:
        case 0xFFEB:
        case 0xFFEC:
        case 0xFFED:
        case 0xFFEE:
        case 0xFFEF:
          this.readApp();
          break;
        case 0xFFFE:
          this.readComment();
          break;
        default:
          if ((current >> 8) !== 0xFF) {
            throw new Error("ERROR: format throw new IOException! (decode)");
          }
      }

      current = this.stream.get16();
    }

    if ((current < 0xFFC0) || (current > 0xFFC7)) {
      throw new Error("ERROR: could not handle arithmetic code!");
    }

    this.frame.read(this.stream);
    current = this.stream.get16();

    do {
      while (current !== 0x0FFDA) { // SOS
        switch (current) {
          case 0xFFC4: // DHT
            this.huffTable.read(this.stream, this.HuffTab);
            break;
          case 0xFFCC: // DAC
            throw new Error("Program doesn't support arithmetic coding. (format throw new IOException)");
          case 0xFFDB:
            this.quantTable.read(this.stream, jpeg.lossless.Decoder.TABLE);
            break;
          case 0xFFDD:
            this.restartInterval = this.readNumber();
            break;
          case 0xFFE0:
          case 0xFFE1:
          case 0xFFE2:
          case 0xFFE3:
          case 0xFFE4:
          case 0xFFE5:
          case 0xFFE6:
          case 0xFFE7:
          case 0xFFE8:
          case 0xFFE9:
          case 0xFFEA:
          case 0xFFEB:
          case 0xFFEC:
          case 0xFFED:
          case 0xFFEE:
          case 0xFFEF:
            this.readApp();
            break;
          case 0xFFFE:
            this.readComment();
            break;
          default:
            if ((current >> 8) !== 0xFF) {
              throw new Error("ERROR: format throw new IOException! (Parser.decode)");
            }
        }

        current = this.stream.get16();
      }

      this.precision = this.frame.precision;
      this.components = this.frame.components;

      if (!this.numBytes) {
        this.numBytes = parseInt(this.precision / 8);
      }

      this.scan.read(this.stream);
      this.numComp = this.scan.numComp;
      this.selection = this.scan.selection;

      if (this.numBytes === 1) {
        if (this.numComp === 3) {
          this.getter = this.getValueRGB;
          this.setter = this.setValueRGB;
          this.output = this.outputRGB;
        } else {
          this.getter = this.getValue8;
          this.setter = this.setValue8;
          this.output = this.outputSingle;
        }
      } else {
        this.getter = this.getValue16;
        this.setter = this.setValue16;
        this.output = this.outputSingle;
      }

      switch (this.selection) {
        case 2:
          this.selector = this.select2;
          break;
        case 3:
          this.selector = this.select3;
          break;
        case 4:
          this.selector = this.select4;
          break;
        case 5:
          this.selector = this.select5;
          break;
        case 6:
          this.selector = this.select6;
          break;
        case 7:
          this.selector = this.select7;
          break;
        default:
          this.selector = this.select1;
          break;
      }

      this.scanComps = this.scan.components;
      this.quantTables = this.quantTable.quantTables;

      for (i = 0; i < this.numComp; i+=1) {
        compN = this.scanComps[i].scanCompSel;
        this.qTab[i] = this.quantTables[this.components[compN].quantTableSel];
        this.nBlock[i] = this.components[compN].vSamp * this.components[compN].hSamp;
        this.dcTab[i] = this.HuffTab[this.scanComps[i].dcTabSel][0];
        this.acTab[i] = this.HuffTab[this.scanComps[i].acTabSel][1];
      }

      this.xDim = this.frame.dimX;
      this.yDim = this.frame.dimY;
      this.outputData = new DataView(new ArrayBuffer(this.xDim * this.yDim * this.numBytes * this.numComp));

      scanNum+=1;

      while (true) { // Decode one scan
        temp[0] = 0;
        index[0] = 0;

        for (i = 0; i < 10; i+=1) {
          pred[i] = (1 << (this.precision - 1));
        }

        if (this.restartInterval === 0) {
          current = this.decodeUnit(pred, temp, index);

          while ((current === 0) && ((this.xLoc < this.xDim) && (this.yLoc < this.yDim))) {
            this.output(pred);
            current = this.decodeUnit(pred, temp, index);
          }

          break; //current=MARKER
        }

        for (mcuNum = 0; mcuNum < this.restartInterval; mcuNum+=1) {
          current = this.decodeUnit(pred, temp, index);
          this.output(pred);

          if (current !== 0) {
            break;
          }
        }

        if (current === 0) {
          if (this.markerIndex !== 0) {
            current = (0xFF00 | this.marker);
            this.markerIndex = 0;
          } else {
            current = this.stream.get16();
          }
        }

        if (!((current >= 0xFFD0) && (current <= 0xFFD7))) {
          break; //current=MARKER
        }
      }

      if ((current === 0xFFDC) && (scanNum === 1)) { //DNL
        this.readNumber();
        current = this.stream.get16();
      }
    } while ((current !== 0xFFD9) && ((this.xLoc < this.xDim) && (this.yLoc < this.yDim)) && (scanNum === 0));

    return this.outputData;
  };



  jpeg.lossless.Decoder.prototype.decodeUnit = function (prev, temp, index) {
    if (this.numComp == 1) {
      return this.decodeSingle(prev, temp, index);
    } else if (this.numComp == 3) {
      return this.decodeRGB(prev, temp, index);
    } else {
      return -1;
    }
  };



  jpeg.lossless.Decoder.prototype.select1 = function (compOffset) {
    return this.getPreviousX(compOffset);
  };



  jpeg.lossless.Decoder.prototype.select2 = function (compOffset) {
    return this.getPreviousY(compOffset);
  };



  jpeg.lossless.Decoder.prototype.select3 = function (compOffset) {
    return this.getPreviousXY(compOffset);
  };



  jpeg.lossless.Decoder.prototype.select4 = function (compOffset) {
    return (this.getPreviousX(compOffset) + this.getPreviousY(compOffset)) - this.getPreviousXY(compOffset);
  };



  jpeg.lossless.Decoder.prototype.select5 = function (compOffset) {
    return this.getPreviousX(compOffset) + ((this.getPreviousY(compOffset) - this.getPreviousXY(compOffset)) >> 1);
  };



  jpeg.lossless.Decoder.prototype.select6 = function (compOffset) {
    return this.getPreviousY(compOffset) + ((this.getPreviousX(compOffset) - this.getPreviousXY(compOffset)) >> 1);
  };



  jpeg.lossless.Decoder.prototype.select7 = function (compOffset) {
    return ((this.getPreviousX(compOffset) + this.getPreviousY(compOffset)) / 2);
  };



  jpeg.lossless.Decoder.prototype.decodeRGB = function (prev, temp, index) {
    /*jslint bitwise: true */

    var value, actab, dctab, qtab, ctrC, i, k, j;

    prev[0] = this.selector(0);
    prev[1] = this.selector(1);
    prev[2] = this.selector(2);

    for (ctrC = 0; ctrC < this.numComp; ctrC+=1) {
      qtab = this.qTab[ctrC];
      actab = this.acTab[ctrC];
      dctab = this.dcTab[ctrC];
      for (i = 0; i < this.nBlock[ctrC]; i+=1) {
        for (k = 0; k < this.IDCT_Source.length; k+=1) {
          this.IDCT_Source[k] = 0;
        }

        value = this.getHuffmanValue(dctab, temp, index);

        if (value >= 0xFF00) {
          return value;
        }

        prev[ctrC] = this.IDCT_Source[0] = prev[ctrC] + this.getn(index, value, temp, index);
        this.IDCT_Source[0] *= qtab[0];

        for (j = 1; j < 64; j+=1) {
          value = this.getHuffmanValue(actab, temp, index);

          if (value >= 0xFF00) {
            return value;
          }

          j += (value >> 4);

          if ((value & 0x0F) === 0) {
            if ((value >> 4) === 0) {
              break;
            }
          } else {
            this.IDCT_Source[jpeg.lossless.Decoder.IDCT_P[j]] = this.getn(index, value & 0x0F, temp, index) * qtab[j];
          }
        }
      }
    }

    return 0;
  };



  jpeg.lossless.Decoder.prototype.decodeSingle = function (prev, temp, index) {
    /*jslint bitwise: true */

    var value, i;

    prev[0] = this.selector();

    for (i = 0; i < this.nBlock[0]; i+=1) {
      value = this.getHuffmanValue(this.dcTab[0], temp, index);
      if (value >= 0xFF00) {
        return value;
      }

      prev[0] += this.getn(prev, value, temp, index);
    }

    return 0;
  };



//	Huffman table for fast search: (HuffTab) 8-bit Look up table 2-layer search architecture, 1st-layer represent 256 node (8 bits) if codeword-length > 8
//	bits, then the entry of 1st-layer = (# of 2nd-layer table) | MSB and it is stored in the 2nd-layer Size of tables in each layer are 256.
//	HuffTab[*][*][0-256] is always the only 1st-layer table.
//
//	An entry can be: (1) (# of 2nd-layer table) | MSB , for code length > 8 in 1st-layer (2) (Code length) << 8 | HuffVal
//
//	HuffmanValue(table   HuffTab[x][y] (ex) HuffmanValue(HuffTab[1][0],...)
//	                ):
//	    return: Huffman Value of table
//	            0xFF?? if it receives a MARKER
//	    Parameter:  table   HuffTab[x][y] (ex) HuffmanValue(HuffTab[1][0],...)
//	                temp    temp storage for remainded bits
//	                index   index to bit of temp
//	                in      FILE pointer
//	    Effect:
//	        temp  store new remainded bits
//	        index change to new index
//	        in    change to new position
//	    NOTE:
//	      Initial by   temp=0; index=0;
//	    NOTE: (explain temp and index)
//	      temp: is always in the form at calling time or returning time
//	       |  byte 4  |  byte 3  |  byte 2  |  byte 1  |
//	       |     0    |     0    | 00000000 | 00000??? |  if not a MARKER
//	                                               ^index=3 (from 0 to 15)
//	                                               321
//	    NOTE (marker and marker_index):
//	      If get a MARKER from 'in', marker=the low-byte of the MARKER
//	        and marker_index=9
//	      If marker_index=9 then index is always > 8, or HuffmanValue()
//	        will not be called
  jpeg.lossless.Decoder.prototype.getHuffmanValue = function (table, temp, index) {
    /*jslint bitwise: true */

    var code, input, mask;
    mask = 0xFFFF;

    if (index[0] < 8) {
      temp[0] <<= 8;
      input = this.stream.get8();
      if (input === 0xFF) {
        this.marker = this.stream.get8();
        if (this.marker !== 0) {
          this.markerIndex = 9;
        }
      }
      temp[0] |= input;
    } else {
      index[0] -= 8;
    }

    code = table[temp[0] >> index[0]];

    if ((code & jpeg.lossless.Decoder.MSB) !== 0) {
      if (this.markerIndex !== 0) {
        this.markerIndex = 0;
        return 0xFF00 | this.marker;
      }

      temp[0] &= (mask >> (16 - index[0]));
      temp[0] <<= 8;
      input = this.stream.get8();

      if (input === 0xFF) {
        this.marker = this.stream.get8();
        if (this.marker !== 0) {
          this.markerIndex = 9;
        }
      }

      temp[0] |= input;
      code = table[((code & 0xFF) * 256) + (temp[0] >> index[0])];
      index[0] += 8;
    }

    index[0] += 8 - (code >> 8);

    if (index[0] < 0) {
      throw new Error("index=" + index[0] + " temp=" + temp[0] + " code=" + code + " in HuffmanValue()");
    }

    if (index[0] < this.markerIndex) {
      this.markerIndex = 0;
      return 0xFF00 | this.marker;
    }

    temp[0] &= (mask >> (16 - index[0]));
    return code & 0xFF;
  };



  jpeg.lossless.Decoder.prototype.getn = function (PRED, n, temp, index) {
    /*jslint bitwise: true */

    var result, one, n_one, mask, input;
    one = 1;
    n_one = -1;
    mask = 0xFFFF;

    if (n === 0) {
      return 0;
    }

    if (n === 16) {
      if (PRED[0] >= 0) {
        return -32768;
      } else {
        return 32768;
      }
    }

    index[0] -= n;

    if (index[0] >= 0) {
      if ((index[0] < this.markerIndex) && !this.isLastPixel()) { // this was corrupting the last pixel in some cases
        this.markerIndex = 0;
        return (0xFF00 | this.marker) << 8;
      }

      result = temp[0] >> index[0];
      temp[0] &= (mask >> (16 - index[0]));
    } else {
      temp[0] <<= 8;
      input = this.stream.get8();

      if (input === 0xFF) {
        this.marker = this.stream.get8();
        if (this.marker !== 0) {
          this.markerIndex = 9;
        }
      }

      temp[0] |= input;
      index[0] += 8;

      if (index[0] < 0) {
        if (this.markerIndex !== 0) {
          this.markerIndex = 0;
          return (0xFF00 | this.marker) << 8;
        }

        temp[0] <<= 8;
        input = this.stream.get8();

        if (input === 0xFF) {
          this.marker = this.stream.get8();
          if (this.marker !== 0) {
            this.markerIndex = 9;
          }
        }

        temp[0] |= input;
        index[0] += 8;
      }

      if (index[0] < 0) {
        throw new Error("index=" + index[0] + " in getn()");
      }

      if (index[0] < this.markerIndex) {
        this.markerIndex = 0;
        return (0xFF00 | this.marker) << 8;
      }

      result = temp[0] >> index[0];
      temp[0] &= (mask >> (16 - index[0]));
    }

    if (result < (one << (n - 1))) {
      result += (n_one << n) + 1;
    }

    return result;
  };



  jpeg.lossless.Decoder.prototype.getPreviousX = function (compOffset) {
    /*jslint bitwise: true */

    if (this.xLoc > 0) {
      return this.getter((((this.yLoc * this.xDim) + this.xLoc) - 1), compOffset);
    } else if (this.yLoc > 0) {
      return this.getPreviousY(compOffset);
    } else {
      return (1 << (this.frame.precision - 1));
    }
  };



  jpeg.lossless.Decoder.prototype.getPreviousXY = function (compOffset) {
    /*jslint bitwise: true */

    if ((this.xLoc > 0) && (this.yLoc > 0)) {
      return this.getter(((((this.yLoc - 1) * this.xDim) + this.xLoc) - 1), compOffset);
    } else {
      return this.getPreviousY(compOffset);
    }
  };



  jpeg.lossless.Decoder.prototype.getPreviousY = function (compOffset) {
    /*jslint bitwise: true */

    if (this.yLoc > 0) {
      return this.getter((((this.yLoc - 1) * this.xDim) + this.xLoc), compOffset);
    } else {
      return this.getPreviousX(compOffset);
    }
  };



  jpeg.lossless.Decoder.prototype.isLastPixel = function () {
    return (this.xLoc === (this.xDim - 1)) && (this.yLoc === (this.yDim - 1));
  };



  jpeg.lossless.Decoder.prototype.outputSingle = function (PRED) {
    if ((this.xLoc < this.xDim) && (this.yLoc < this.yDim)) {
      this.setter((((this.yLoc * this.xDim) + this.xLoc)), PRED[0]);

      this.xLoc+=1;

      if (this.xLoc >= this.xDim) {
        this.yLoc+=1;
        this.xLoc = 0;
      }
    }
  };



  jpeg.lossless.Decoder.prototype.outputRGB = function (PRED) {
    var offset = ((this.yLoc * this.xDim) + this.xLoc);

    if ((this.xLoc < this.xDim) && (this.yLoc < this.yDim)) {
      this.setter(offset, PRED[0], 0);
      this.setter(offset, PRED[1], 1);
      this.setter(offset, PRED[2], 2);

      this.xLoc+=1;

      if (this.xLoc >= this.xDim) {
        this.yLoc+=1;
        this.xLoc = 0;
      }
    }
  };



  jpeg.lossless.Decoder.prototype.setValue16 = function (index, val) {
    this.outputData.setInt16(index * 2, val, true);
  };



  jpeg.lossless.Decoder.prototype.getValue16 = function (index) {
    return this.outputData.getInt16(index * 2, true);
  };



  jpeg.lossless.Decoder.prototype.setValue8 = function (index, val) {
    this.outputData.setInt8(index, val);
  };



  jpeg.lossless.Decoder.prototype.getValue8 = function (index) {
    return this.outputData.getInt8(index);
  };



  jpeg.lossless.Decoder.prototype.setValueRGB = function (index, val, compOffset) {
    this.outputData.setUint8(index * 3 + compOffset, val);
  };



  jpeg.lossless.Decoder.prototype.getValueRGB = function (index, compOffset) {
    return this.outputData.getUint8(index * 3 + compOffset);
  };



  jpeg.lossless.Decoder.prototype.readApp = function() {
    var count = 0, length = this.stream.get16();
    count += 2;

    while (count < length) {
      this.stream.get8();
      count+=1;
    }

    return length;
  };



  jpeg.lossless.Decoder.prototype.readComment = function () {
    var sb = "", count = 0, length;

    length = this.stream.get16();
    count += 2;

    while (count < length) {
      sb += this.stream.get8();
      count+=1;
    }

    return sb;
  };



  jpeg.lossless.Decoder.prototype.readNumber = function() {
    var Ld = this.stream.get16();

    if (Ld !== 4) {
      throw new Error("ERROR: Define number format throw new IOException [Ld!=4]");
    }

    return this.stream.get16();
  };



  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.Decoder;
  }

},{"./data-stream.js":2,"./frame-header.js":4,"./huffman-table.js":5,"./quantization-table.js":7,"./scan-header.js":9,"./utils.js":10}],4:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};
  jpeg.lossless.ComponentSpec = jpeg.lossless.ComponentSpec || ((typeof require !== 'undefined') ? require('./component-spec.js') : null);
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);


  /*** Constructor ***/
  jpeg.lossless.FrameHeader = jpeg.lossless.FrameHeader || function () {
    this.components = []; // Components
    this.dimX = 0; // Number of samples per line
    this.dimY = 0; // Number of lines
    this.numComp = 0; // Number of component in the frame
    this.precision = 0; // Sample Precision (from the original image)
  };



  /*** Prototype Methods ***/

  jpeg.lossless.FrameHeader.prototype.read = function (data) {
    /*jslint bitwise: true */

    var count = 0, length, i, c, temp;

    length = data.get16();
    count += 2;

    this.precision = data.get8();
    count+=1;

    this.dimY = data.get16();
    count += 2;

    this.dimX = data.get16();
    count += 2;

    this.numComp = data.get8();
    count+=1;
    for (i = 1; i <= this.numComp; i+=1) {
      if (count > length) {
        throw new Error("ERROR: frame format error");
      }

      c = data.get8();
      count+=1;

      if (count >= length) {
        throw new Error("ERROR: frame format error [c>=Lf]");
      }

      temp = data.get8();
      count+=1;

      if (!this.components[c]) {
        this.components[c] = new jpeg.lossless.ComponentSpec();
      }

      this.components[c].hSamp = temp >> 4;
      this.components[c].vSamp = temp & 0x0F;
      this.components[c].quantTableSel = data.get8();
      count+=1;
    }

    if (count !== length) {
      throw new Error("ERROR: frame format error [Lf!=count]");
    }

    return 1;
  };


  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.FrameHeader;
  }

},{"./component-spec.js":1,"./data-stream.js":2}],5:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
  jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


  /*** Constructor ***/
  jpeg.lossless.HuffmanTable = jpeg.lossless.HuffmanTable || function () {
    this.l = jpeg.lossless.Utils.createArray(4, 2, 16);
    this.th = [];
    this.v = jpeg.lossless.Utils.createArray(4, 2, 16, 200);
    this.tc = jpeg.lossless.Utils.createArray(4, 2);

    this.tc[0][0] = 0;
    this.tc[1][0] = 0;
    this.tc[2][0] = 0;
    this.tc[3][0] = 0;
    this.tc[0][1] = 0;
    this.tc[1][1] = 0;
    this.tc[2][1] = 0;
    this.tc[3][1] = 0;
    this.th[0] = 0;
    this.th[1] = 0;
    this.th[2] = 0;
    this.th[3] = 0;
  };



  /*** Static Pseudo-constants ***/

  jpeg.lossless.HuffmanTable.MSB = 0x80000000;


  /*** Prototype Methods ***/

  jpeg.lossless.HuffmanTable.prototype.read = function(data, HuffTab) {
    /*jslint bitwise: true */

    var count = 0, length, temp, t, c, i, j;

    length = data.get16();
    count += 2;

    while (count < length) {
      temp = data.get8();
      count+=1;
      t = temp & 0x0F;
      if (t > 3) {
        throw new Error("ERROR: Huffman table ID > 3");
      }

      c = temp >> 4;
      if (c > 2) {
        throw new Error("ERROR: Huffman table [Table class > 2 ]");
      }

      this.th[t] = 1;
      this.tc[t][c] = 1;

      for (i = 0; i < 16; i+=1) {
        this.l[t][c][i] = data.get8();
        count+=1;
      }

      for (i = 0; i < 16; i+=1) {
        for (j = 0; j < this.l[t][c][i]; j+=1) {
          if (count > length) {
            throw new Error("ERROR: Huffman table format error [count>Lh]");
          }

          this.v[t][c][i][j] = data.get8();
          count+=1;
        }
      }
    }

    if (count !== length) {
      throw new Error("ERROR: Huffman table format error [count!=Lf]");
    }

    for (i = 0; i < 4; i+=1) {
      for (j = 0; j < 2; j+=1) {
        if (this.tc[i][j] !== 0) {
          this.buildHuffTable(HuffTab[i][j], this.l[i][j], this.v[i][j]);
        }
      }
    }

    return 1;
  };



//	Build_HuffTab()
//	Parameter:  t       table ID
//	            c       table class ( 0 for DC, 1 for AC )
//	            L[i]    # of codewords which length is i
//	            V[i][j] Huffman Value (length=i)
//	Effect:
//	    build up HuffTab[t][c] using L and V.
  jpeg.lossless.HuffmanTable.prototype.buildHuffTable = function(tab, L, V) {
    /*jslint bitwise: true */

    var currentTable, temp, k, i, j, n;
    temp = 256;
    k = 0;

    for (i = 0; i < 8; i+=1) { // i+1 is Code length
      for (j = 0; j < L[i]; j+=1) {
        for (n = 0; n < (temp >> (i + 1)); n+=1) {
          tab[k] = V[i][j] | ((i + 1) << 8);
          k+=1;
        }
      }
    }

    for (i = 1; k < 256; i+=1, k+=1) {
      tab[k] = i | jpeg.lossless.HuffmanTable.MSB;
    }

    currentTable = 1;
    k = 0;

    for (i = 8; i < 16; i+=1) { // i+1 is Code length
      for (j = 0; j < L[i]; j+=1) {
        for (n = 0; n < (temp >> (i - 7)); n+=1) {
          tab[(currentTable * 256) + k] = V[i][j] | ((i + 1) << 8);
          k+=1;
        }

        if (k >= 256) {
          if (k > 256) {
            throw new Error("ERROR: Huffman table error(1)!");
          }

          k = 0;
          currentTable+=1;
        }
      }
    }
  };


  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.HuffmanTable;
  }

},{"./data-stream.js":2,"./utils.js":10}],6:[function(require,module,exports){
  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};
  jpeg.lossless.ComponentSpec = jpeg.lossless.ComponentSpec || ((typeof require !== 'undefined') ? require('./component-spec.js') : null);
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
  jpeg.lossless.Decoder = jpeg.lossless.Decoder || ((typeof require !== 'undefined') ? require('./decoder.js') : null);
  jpeg.lossless.FrameHeader = jpeg.lossless.FrameHeader || ((typeof require !== 'undefined') ? require('./frame-header.js') : null);
  jpeg.lossless.HuffmanTable = jpeg.lossless.HuffmanTable || ((typeof require !== 'undefined') ? require('./huffman-table.js') : null);
  jpeg.lossless.QuantizationTable = jpeg.lossless.QuantizationTable || ((typeof require !== 'undefined') ? require('./quantization-table.js') : null);
  jpeg.lossless.ScanComponent = jpeg.lossless.ScanComponent || ((typeof require !== 'undefined') ? require('./scan-component.js') : null);
  jpeg.lossless.ScanHeader = jpeg.lossless.ScanHeader || ((typeof require !== 'undefined') ? require('./scan-header.js') : null);
  jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


  /*** Exports ***/
  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg;
  }

},{"./component-spec.js":1,"./data-stream.js":2,"./decoder.js":3,"./frame-header.js":4,"./huffman-table.js":5,"./quantization-table.js":7,"./scan-component.js":8,"./scan-header.js":9,"./utils.js":10}],7:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
  jpeg.lossless.Utils = jpeg.lossless.Utils || ((typeof require !== 'undefined') ? require('./utils.js') : null);


  /*** Constructor ***/
  jpeg.lossless.QuantizationTable = jpeg.lossless.QuantizationTable || function () {
    this.precision = []; // Quantization precision 8 or 16
    this.tq = []; // 1: this table is presented
    this.quantTables = jpeg.lossless.Utils.createArray(4, 64); // Tables

    this.tq[0] = 0;
    this.tq[1] = 0;
    this.tq[2] = 0;
    this.tq[3] = 0;
  };



  /*** Static Methods ***/

  jpeg.lossless.QuantizationTable.enhanceQuantizationTable = function(qtab, table) {
    /*jslint bitwise: true */

    var i;

    for (i = 0; i < 8; i+=1) {
      qtab[table[(0 * 8) + i]] *= 90;
      qtab[table[(4 * 8) + i]] *= 90;
      qtab[table[(2 * 8) + i]] *= 118;
      qtab[table[(6 * 8) + i]] *= 49;
      qtab[table[(5 * 8) + i]] *= 71;
      qtab[table[(1 * 8) + i]] *= 126;
      qtab[table[(7 * 8) + i]] *= 25;
      qtab[table[(3 * 8) + i]] *= 106;
    }

    for (i = 0; i < 8; i+=1) {
      qtab[table[0 + (8 * i)]] *= 90;
      qtab[table[4 + (8 * i)]] *= 90;
      qtab[table[2 + (8 * i)]] *= 118;
      qtab[table[6 + (8 * i)]] *= 49;
      qtab[table[5 + (8 * i)]] *= 71;
      qtab[table[1 + (8 * i)]] *= 126;
      qtab[table[7 + (8 * i)]] *= 25;
      qtab[table[3 + (8 * i)]] *= 106;
    }

    for (i = 0; i < 64; i+=1) {
      qtab[i] >>= 6;
    }
  };


  /*** Prototype Methods ***/

  jpeg.lossless.QuantizationTable.prototype.read = function (data, table) {
    /*jslint bitwise: true */

    var count = 0, length, temp, t, i;

    length = data.get16();
    count += 2;

    while (count < length) {
      temp = data.get8();
      count+=1;
      t = temp & 0x0F;

      if (t > 3) {
        throw new Error("ERROR: Quantization table ID > 3");
      }

      this.precision[t] = temp >> 4;

      if (this.precision[t] === 0) {
        this.precision[t] = 8;
      } else if (this.precision[t] === 1) {
        this.precision[t] = 16;
      } else {
        throw new Error("ERROR: Quantization table precision error");
      }

      this.tq[t] = 1;

      if (this.precision[t] === 8) {
        for (i = 0; i < 64; i+=1) {
          if (count > length) {
            throw new Error("ERROR: Quantization table format error");
          }

          this.quantTables[t][i] = data.get8();
          count+=1;
        }

        jpeg.lossless.QuantizationTable.enhanceQuantizationTable(this.quantTables[t], table);
      } else {
        for (i = 0; i < 64; i+=1) {
          if (count > length) {
            throw new Error("ERROR: Quantization table format error");
          }

          this.quantTables[t][i] = data.get16();
          count += 2;
        }

        jpeg.lossless.QuantizationTable.enhanceQuantizationTable(this.quantTables[t], table);
      }
    }

    if (count !== length) {
      throw new Error("ERROR: Quantization table error [count!=Lq]");
    }

    return 1;
  };



  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.QuantizationTable;
  }

},{"./data-stream.js":2,"./utils.js":10}],8:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};


  /*** Constructor ***/
  jpeg.lossless.ScanComponent = jpeg.lossless.ScanComponent || function () {
    this.acTabSel = 0; // AC table selector
    this.dcTabSel = 0; // DC table selector
    this.scanCompSel = 0; // Scan component selector
  };



  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.ScanComponent;
  }

},{}],9:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};
  jpeg.lossless.DataStream = jpeg.lossless.DataStream || ((typeof require !== 'undefined') ? require('./data-stream.js') : null);
  jpeg.lossless.ScanComponent = jpeg.lossless.ScanComponent || ((typeof require !== 'undefined') ? require('./scan-component.js') : null);


  /*** Constructor ***/
  jpeg.lossless.ScanHeader = jpeg.lossless.ScanHeader || function () {
    this.ah = 0;
    this.al = 0;
    this.numComp = 0; // Number of components in the scan
    this.selection = 0; // Start of spectral or predictor selection
    this.spectralEnd = 0; // End of spectral selection
    this.components = [];
  };


  /*** Prototype Methods ***/

  jpeg.lossless.ScanHeader.prototype.read = function(data) {
    /*jslint bitwise: true */

    var count = 0, length, i, temp;

    length = data.get16();
    count += 2;

    this.numComp = data.get8();
    count+=1;

    for (i = 0; i < this.numComp; i+=1) {
      this.components[i] = new jpeg.lossless.ScanComponent();

      if (count > length) {
        throw new Error("ERROR: scan header format error");
      }

      this.components[i].scanCompSel = data.get8();
      count+=1;

      temp = data.get8();
      count+=1;

      this.components[i].dcTabSel = (temp >> 4);
      this.components[i].acTabSel = (temp & 0x0F);
    }

    this.selection = data.get8();
    count+=1;

    this.spectralEnd = data.get8();
    count+=1;

    temp = data.get8();
    this.ah = (temp >> 4);
    this.al = (temp & 0x0F);
    count+=1;

    if (count !== length) {
      throw new Error("ERROR: scan header format error [count!=Ns]");
    }

    return 1;
  };



  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.ScanHeader;
  }

},{"./data-stream.js":2,"./scan-component.js":8}],10:[function(require,module,exports){
  /*
   * Copyright (C) 2015 Michael Martinez
   * Changes: Added support for selection values 2-7, fixed minor bugs &
   * warnings, split into multiple class files, and general clean up.
   *
   * 08-25-2015: Helmut Dersch agreed to a license change from LGPL to MIT.
   */

  /*
   * Copyright (C) Helmut Dersch
   *
   * Permission is hereby granted, free of charge, to any person obtaining a copy
   * of this software and associated documentation files (the "Software"), to deal
   * in the Software without restriction, including without limitation the rights
   * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   * copies of the Software, and to permit persons to whom the Software is
   * furnished to do so, subject to the following conditions:

   * The above copyright notice and this permission notice shall be included in
   * all copies or substantial portions of the Software.

   * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   * THE SOFTWARE.
   */

  /*jslint browser: true, node: true */
  /*global require, module */

  "use strict";

  /*** Imports ***/
  var jpeg = jpeg || {};
  jpeg.lossless = jpeg.lossless || {};


  /*** Constructor ***/
  jpeg.lossless.Utils = jpeg.lossless.Utils || {};


  /*** Static methods ***/

// http://stackoverflow.com/questions/966225/how-can-i-create-a-two-dimensional-array-in-javascript
  jpeg.lossless.Utils.createArray = function (length) {
    var arr = new Array(length || 0),
      i = length;

    if (arguments.length > 1) {
      var args = Array.prototype.slice.call(arguments, 1);
      while(i--) arr[length-1 - i] = jpeg.lossless.Utils.createArray.apply(this, args);
    }

    return arr;
  };


  /*** Exports ***/

  var moduleType = typeof module;
  if ((moduleType !== 'undefined') && module.exports) {
    module.exports = jpeg.lossless.Utils;
  }

},{}]},{},[6])(6)
});
(function (cornerstoneWADOImageLoader) {

  "use strict";
  function extractUncompressedPixels(imgData, frame)
  {
    var pixelFormat = cornerstoneWADOImageLoader.getPixelFormat(imgData);
    var numPixels = imgData.width * imgData.height * imgData.samplesPerPixel;
    // Note - we may want to sanity check the rows * columns * bitsAllocated * samplesPerPixel against the buffer size

    var frameOffset = 0;
    if(pixelFormat === 1) {
      frameOffset = imgData.bufferOffset + frame * numPixels;
      return new Uint8Array(imgData.buffer, frameOffset, numPixels);
    }
    else if(pixelFormat === 2) {
      frameOffset = imgData.bufferOffset + frame * numPixels * 2;
      return new Uint16Array(imgData.buffer, frameOffset, numPixels);
    }
    else if(pixelFormat === 3) {
      frameOffset = imgData.bufferOffset + frame * numPixels * 2;
      return new Int16Array(imgData.buffer, frameOffset, numPixels);
    }
  }

  cornerstoneWADOImageLoader.extractUncompressedPixels = extractUncompressedPixels;
}(cornerstoneWADOImageLoader));

(function (cornerstoneWADOImageLoader) {

  "use strict";

  function loadImage(imageId) {

    // build a url by parsing out the url scheme and frame index from the imageId
    var firstColonIndex = imageId.indexOf(':');
    var url = imageId.substring(firstColonIndex + 1);
    var frameIndex = url.indexOf('frame=');
    var frame;
    if(frameIndex !== -1) {
      var frameStr = url.substr(frameIndex + 6);
      frame = parseInt(frameStr);
      url = url.substr(0, frameIndex-1);
    }

    // if multiframe and cached, use the cached data set to extract the frame
    if(frame !== undefined &&
      cornerstoneWADOImageLoader.internal.multiFrameCacheHack.hasOwnProperty(url))
    {
      var dataSet = cornerstoneWADOImageLoader.internal.multiFrameCacheHack[url];
      var imagePromise = cornerstoneWADOImageLoader.createImageObject(dataSet, imageId, frame);
      imagePromise.then(function(image) {
        deferred.resolve(image);
      }, function(error) {
        deferred.reject(error);
      });
      return deferred;
    }

    var fileIndex = parseInt(url);
    var file = cornerstoneWADOImageLoader.fileManager.get(fileIndex);
    if(file === undefined)
      throw 'unknown file index ';

    return new Promise(function(resolve, reject){
      var fileReader = new FileReader();
      fileReader.onload = function(e) {
        try{
          // Parse the DICOM File
          var dicomPart10AsArrayBuffer = e.target.result;
          var byteArray = new Uint8Array(dicomPart10AsArrayBuffer);
          var dataSet = dicomParser.parseDicom(byteArray);

          // if multiframe, cache the parsed data set to speed up subsequent
          // requests for the other frames
          if(frame !== undefined) {
            var dataSet = cornerstoneWADOImageLoader.internal.multiFrameCacheHack[url];
            resolve(cornerstoneWADOImageLoader.createImageObject(dataSet, imageId, frame));
          }

          resolve(cornerstoneWADOImageLoader.createImageObject(dataSet, imageId, frame));
        }catch(e){
          reject(e);
        }
      };
      fileReader.readAsArrayBuffer(file);
    });
  }

  // registery dicomweb and wadouri image loader prefixes
  //cornerstone.registerImageLoader('dicomfile', loadImage);

}(cornerstoneWADOImageLoader));
/**
 */
(function (cornerstoneWADOImageLoader) {

  "use strict";

  var files = [];

  function add(file) {
    var fileIndex =  files.push(file);
    return 'dicomfile:' + (fileIndex - 1);
  }

  function get(index) {
    return files[index];
  }

  function remove(index) {
    files[index] = undefined;
  }

  function purge() {
    files = [];
  }

  // module exports
  cornerstoneWADOImageLoader.fileManager = {
    add : add,
    get : get,
    remove:remove,
    purge: purge
  };

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function getMinMax(storedPixelData)
  {
    // we always calculate the min max values since they are not always
    // present in DICOM and we don't want to trust them anyway as cornerstone
    // depends on us providing reliable values for these
    var min = 65535;
    var max = -32768;
    var numPixels = storedPixelData.length;
    var pixelData = storedPixelData;
    for(var index = 0; index < numPixels; index++) {
      var spv = pixelData[index];
      // TODO: test to see if it is faster to use conditional here rather than calling min/max functions
      min = Math.min(min, spv);
      max = Math.max(max, spv);
    }

    return {
      min: min,
      max: max
    };
  }

  // module exports
  cornerstoneWADOImageLoader.getMinMax = getMinMax;

}(cornerstoneWADOImageLoader));


(function (cornerstoneWADOImageLoader) {

  "use strict";

  function getPixelFormat(imgData) {
    if(imgData.pixelRepresentation === 0 && imgData.bitsAllocated === 8)
      return 1; // unsigned 8 bit
    
    if(imgData.pixelRepresentation === 0 && imgData.bitsAllocated === 16)
      return 2; // unsigned 16 bit
    
    if(imgData.pixelRepresentation === 1 && imgData.bitsAllocated === 16)
      return 3; // signed 16 bit data
  }


  // module exports
  cornerstoneWADOImageLoader.getPixelFormat = getPixelFormat;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  var options = {
    // callback allowing customization of the xhr (e.g. adding custom auth headers, cors, etc)
    beforeSend : function(xhr) {}
  };

  function configure(opts) {
    options = opts;
  }

  function isColorImage(photoMetricInterpretation)
  {
    if(photoMetricInterpretation === "RGB" ||
      photoMetricInterpretation === "PALETTE COLOR" ||
      photoMetricInterpretation === "YBR_FULL" ||
      photoMetricInterpretation === "YBR_FULL_422" ||
      photoMetricInterpretation === "YBR_PARTIAL_422" ||
      photoMetricInterpretation === "YBR_PARTIAL_420" ||
      photoMetricInterpretation === "YBR_RCT" ||
      photoMetricInterpretation === "YBR_ICT")
        return true;
  
    return false;
  }

  cornerstoneWADOImageLoader.isColorImage = isColorImage;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

    "use strict";

    var canvas;//TODO = document.createElement('canvas');
    var lastImageIdDrawn = "";

    function extractStoredPixels(imgObj) {

        // special case for JPEG Baseline 8 bit
        if(cornerstoneWADOImageLoader.isJPEGBaseline8Bit(imgObj) === true)
        {
          //return cornerstoneWADOImageLoader.decodeJPEGBaseline8Bit(canvas, dataSet, frame);
          //Will do it on main thread using Image and Canvas object
          return imgObj.buffer;
        }

        var decodedImageFrame = cornerstoneWADOImageLoader.decodeTransferSyntax(imgObj);

        return cornerstoneWADOImageLoader.convertColorSpace(imgObj, decodedImageFrame);
    }

    function makeColorImage(imgId, imgObj) {

        // extract the DICOM attributes we need
        /*
        var pixelSpacing = cornerstoneWADOImageLoader.getPixelSpacing(dataSet);
        var rows = dataSet.uint16('x00280010');
        var columns = dataSet.uint16('x00280011');
        var rescaleSlopeAndIntercept = cornerstoneWADOImageLoader.getRescaleSlopeAndIntercept(dataSet);
        var bytesPerPixel = 4;
        var numPixels = rows * columns;
        var sizeInBytes = numPixels * bytesPerPixel;
        var windowWidthAndCenter = cornerstoneWADOImageLoader.getWindowWidthAndCenter(dataSet);
        */

        /*
        function getPixelData() {
            return imageData.data;
        }

        function getImageData() {
            return imageData;
        }

         // clear the lastImageIdDrawn so we update the canvas
        var lastImageIdDrawn = undefined;
        function getCanvas() {
            if(lastImageIdDrawn === imageId) {
                return canvas;
            }

            canvas.height = rows;
            canvas.width = columns;
            var context = canvas.getContext('2d');
            context.putImageData(imageData, 0, 0 );
            lastImageIdDrawn = imageId;
            return canvas;
        }
        */

        // Extract the various attributes we need
        var image = {
            imageId : imgId,
            minPixelValue : 0,
            maxPixelValue : 255,
            // Decompress and decode the pixel data for this image
            pixelData: extractStoredPixels(imgObj),
            /*
            slope: rescaleSlopeAndIntercept.slope,
            intercept: rescaleSlopeAndIntercept.intercept,
            windowCenter : windowWidthAndCenter.windowCenter,
            windowWidth : windowWidthAndCenter.windowWidth,
            //render: cornerstone.renderColorImage,
            getPixelData: getPixelData,
            getImageData: getImageData,
            getCanvas: getCanvas,
            rows: rows,
            columns: columns,
            height: rows,
            width: columns,
            */
            color: true,
            /*
            columnPixelSpacing: pixelSpacing.column,
            rowPixelSpacing: pixelSpacing.row,
            data: dataSet,
            invert: false,
            sizeInBytes: sizeInBytes
            */
        };

        /*
        if(image.windowCenter === undefined) {
            image.windowWidth = 255;
            image.windowCenter = 128;
        }
        */

        return image;
    }

    // module exports
    cornerstoneWADOImageLoader.makeColorImage = makeColorImage;
}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

    "use strict";

    function makeGrayscaleImage(imgId, imgObj) {

        // extract the DICOM attributes we need
        /*
        var pixelSpacing = cornerstoneWADOImageLoader.getPixelSpacing(dataSet);
        var rows = dataSet.uint16('x00280010');
        var columns = dataSet.uint16('x00280011');
        var rescaleSlopeAndIntercept = cornerstoneWADOImageLoader.getRescaleSlopeAndIntercept(dataSet);

        var bytesPerPixel;
        try {
            bytesPerPixel = getBytesPerPixel(dataSet);
        } catch(error) {
            deferred.reject(error);
            return deferred;
        }

        var numPixels = rows * columns;
        var sizeInBytes = numPixels * bytesPerPixel;
        var photometricInterpretation = dataSet.string('x00280004');
        var invert = (photometricInterpretation === "MONOCHROME1");
        var windowWidthAndCenter = cornerstoneWADOImageLoader.getWindowWidthAndCenter(dataSet);
        */
       
        // Decompress and decode the pixel data for this image
        var storedPixelData = cornerstoneWADOImageLoader.decodeTransferSyntax(imgObj);

        var minMax = cornerstoneWADOImageLoader.getMinMax(storedPixelData);

        /*
        function getPixelData() {
            return storedPixelData;
        }
        */

        // Extract the various attributes we need
        var image = {
            imageId : imgId,
            minPixelValue : minMax.min,
            maxPixelValue : minMax.max,
            /*
            slope: rescaleSlopeAndIntercept.slope,
            intercept: rescaleSlopeAndIntercept.intercept,
            windowCenter : windowWidthAndCenter.windowCenter,
            windowWidth : windowWidthAndCenter.windowWidth,
            render: cornerstone.renderGrayscaleImage,
            //getPixelData: getPixelData,
            //pixelBuffer: storedPixelData.buffer,
            */
            pixelData: storedPixelData,
            color: false,
            /*
            rows: rows,
            columns: columns,
            height: rows,
            width: columns,
           
            columnPixelSpacing: pixelSpacing.column,
            rowPixelSpacing: pixelSpacing.row,
            data: dataSet,
            invert: invert,
            sizeInBytes: sizeInBytes
            */
        };

        // modality LUT
        /*
        var pixelRepresentation = dataSet.uint16('x00280103');
        if(dataSet.elements.x00283000) {
          image.modalityLUT = getLUT(image, pixelRepresentation, dataSet.elements.x00283000.items[0].dataSet);
        }

        // VOI LUT
        if(dataSet.elements.x00283010) {
          pixelRepresentation = 0;
          // if modality LUT can produce negative values, the data is signed
          if(image.minPixelValue * image.slope + image.intercept < 0) {
            pixelRepresentation = 1;
          }
          image.voiLUT = getLUT(image, pixelRepresentation, dataSet.elements.x00283010.items[0].dataSet);
        }
        
        
        // TODO: deal with pixel padding and all of the various issues by setting it to min pixel value (or lower)
        // TODO: Mask out overlays embedded in pixel data above high bit

        if(image.windowCenter === undefined) {
            var maxVoi = image.maxPixelValue * image.slope + image.intercept;
            var minVoi = image.minPixelValue * image.slope + image.intercept;
            image.windowWidth = maxVoi - minVoi;
            image.windowCenter = (maxVoi + minVoi) / 2;
        }
        */

        return image;
    }

    // module exports
    cornerstoneWADOImageLoader.makeGrayscaleImage = makeGrayscaleImage;
}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  // module exports
  cornerstoneWADOImageLoader.version = '0.7.2';

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  function checkToken(token, data, dataOffset) {

    if(dataOffset + token.length > data.length)
      //console.log('dataOffset >> ', dataOffset);
      return false;

    var endIndex = dataOffset;

    for(var i = 0; i < token.length; i++)
      if(token[i] !== data[endIndex++])
        return false;
    
    return true;
  }

  function stringToUint8Array(str) {
    var uint=new Uint8Array(str.length);
    for(var i=0,j=str.length;i<j;i++){
      uint[i]=str.charCodeAt(i);
    }
    return uint;
  }

  function findIndexOfString(data, str, offset) {

    offset = offset || 0;

    var token = stringToUint8Array(str);

    for(var i=offset; i < data.length; i++) {
      if(token[0] === data[i]) {
        //console.log('match @', i);
        if(checkToken(token, data, i)) {
          return i;
        }
      }
    }
    return -1;
  }
  cornerstoneWADOImageLoader.internal.findIndexOfString = findIndexOfString;

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function findBoundary(header) {
    for(var i=0; i < header.length; i++) {
      if(header[i].substr(0,2) === '--') {
        return header[i];
      }
    }
   
    throw 'no boundary marker';
  }

  //TODO indexOf() polyfill
  function findTransferSyntax(headers) {
    for(var i=0; i < headers.length; i++) {
      var header = headers[i];
      if(header.indexOf('Content-Type:') == 0) {
        var contentType = header.substr(13).trim();
        
        //If a transfer syntax is specified always use it
        var tsIdx = contentType.indexOf('transfer-syntax="');
        if(tsIdx > 0){
          var startIdx = tsIdx + 17;
          return contentType.substr(startIdx, contentType.indexOf('"', startIdx)-startIdx);
        }

        /*
          From here we could use strict equality : 
            if(contentType == 'string')
          but using indexOf() seems more flexible since we never know what we'll get from the server
        */

        if(contentType.indexOf('application/octet-stream') >= 0)
          //Uncompressed pixel data
          //it's always little endian, implicit or explicit does not matter for pixeldata
          return "1.2.840.10008.1.2";

        //else get default value for content-type
        if(contentType.indexOf('image/dicom+jpeg') >= 0)
          //Lossless
          return "1.2.840.10008.1.2.4.70";

        if(contentType.indexOf('image/dicom+rle') >= 0)
          return "1.2.840.10008.1.2.5";

        if(contentType.indexOf('image/dicom+jpeg-ls') >= 0)
          return "1.2.840.10008.1.2.4.80";

        if(contentType.indexOf('image/dicom+jp2') >= 0)
          //Lossless JPEG 2000
          return "1.2.840.10008.1.2.4.90";

        if(contentType.indexOf('image/dicom+jpx') >= 0)
          //Lossless JPEG 2000 multicomponent
          return "1.2.840.10008.1.2.4.92";
      }
    }
  }

  function uint8ArrayToString(data, offset, length) {
    offset = offset || 0;
    length = length || data.length - offset;
    var str = "";
    for(var i=offset; i < offset + length; i++) {
      str += String.fromCharCode(data[i]);
    }
    return str;
  };

  function findStringIdx(data, str, offset, err){
    var result = cornerstoneWADOImageLoader.internal.findIndexOfString(data, str, offset);
    if(result === -1)
      throw err;

    return result;
  }

  cornerstoneWADOImageLoader.internal.getImageFrame = function(uri, mediaType, cb) {
    mediaType = mediaType || 'application/octet-stream';

    var xhr = new XMLHttpRequest();
    xhr.open("get", uri, true);
    xhr.responseType = "arraybuffer";
    xhr.setRequestHeader('Accept', 'multipart/related;type=' + mediaType);
    xhr.onreadystatechange = function () {
      // TODO: consider sending out progress messages here as we receive the pixel data
      // TODO: multipart (all part not just first one :) )
      // TODO: streaming parsing
      if (xhr.readyState === 4) {
        try{
          if (xhr.status === 200) {
            // request succeeded, Parse the multi-part mime response
            var response = new Uint8Array(xhr.response),
            // First look for the multipart mime header
                tokenIndex = findStringIdx(response, '\n\r\n', 0, 'no multipart mime header'),
            
                header = uint8ArrayToString(response, 0, tokenIndex),
                // Now find the boundary  marker
                split = header.split('\r\n'),
                boundary = findBoundary(split),    
                transferSyntax = findTransferSyntax(split),    

                offset = tokenIndex + 3, // skip over the \n\r\n
                // find the terminal boundary marker
                endIndex = findStringIdx(response, boundary, offset, 'terminating boundary not found');
          }
          else
            throw 'request failed';
          
        }catch(e){
          console.log('invalid response - ', e);
          //TODO
          return;
        }

        cb({
          transferSyntax: transferSyntax,
          arrayBuffer: xhr.response.slice(offset, endIndex-1)
        });
      }
    };
    xhr.send();
  };
  
}(cornerstoneWADOImageLoader));

(function (cornerstoneWADOImageLoader) {

  "use strict";

  function uint8ArrayToString(data, offset, length) {
    offset = offset || 0;
    length = length || data.length - offset;
    var str = "";
    for(var i=offset; i < offset + length; i++) {
      str += String.fromCharCode(data[i]);
    }
    return str;
  };

  cornerstoneWADOImageLoader.wadors = {
    loadImage: function(url, imgData, cb) {
      cornerstoneWADOImageLoader.internal.getImageFrame(url, 'application/octet-stream',
        function(result) {
          //tmp warning
          if(!result.transferSyntax)
            console.warn('missing transfer-syntax. Using Implicit Little Endian: 1.2.840.10008.1.2');
          
          imgData.transferSyntax = result.transferSyntax || "1.2.840.10008.1.2";
          imgData.buffer = result.arrayBuffer;
          imgData.bufferOffset = 0;

          cb( cornerstoneWADOImageLoader.createImageObject(url, imgData, 0) );
      });
    }
  };

  // registery dicomweb and wadouri image loader prefixes
  //cornerstone.registerImageLoader('wadors', loadImage);

}(cornerstoneWADOImageLoader));

(function (cornerstoneWADOImageLoader) {

  "use strict";

  // Loads an image given an imageId
  // wado url example:
  // http://localhost:3333/wado?requestType=WADO&studyUID=1.3.6.1.4.1.25403.166563008443.5076.20120418075541.1&seriesUID=1.3.6.1.4.1.25403.166563008443.5076.20120418075541.2&objectUID=1.3.6.1.4.1.25403.166563008443.5076.20120418075557.1&contentType=application%2Fdicom&transferSyntax=1.2.840.10008.1.2.1
  // NOTE: supposedly the instance will be returned in Explicit Little Endian transfer syntax if you don't
  // specify a transferSyntax but Osirix doesn't do this and seems to return it with the transfer syntax it is
  // stored as.
  function loadImage(imageId) {
    // create a deferred object

    // build a url by parsing out the url scheme and frame index from the imageId
    var firstColonIndex = imageId.indexOf(':');
    var url = imageId.substring(firstColonIndex + 1);
    var frameIndex = url.indexOf('frame=');
    var frame;
    if(frameIndex !== -1) {
      var frameStr = url.substr(frameIndex + 6);
      frame = parseInt(frameStr);
      url = url.substr(0, frameIndex-1);
    }

    // if multiframe and cached, use the cached data set to extract the frame
    if(frame !== undefined &&
      cornerstoneWADOImageLoader.internal.multiFrameCacheHack.hasOwnProperty(url))
    {

      var dataSet = cornerstoneWADOImageLoader.internal.multiFrameCacheHack[url];
      return cornerstoneWADOImageLoader.createImageObject(dataSet, imageId, frame);
    }

    return cornerstoneWADOImageLoader.internal.xhrRequest(imageId, frame, url);
  }

  // registery dicomweb and wadouri image loader prefixes
  //cornerstone.registerImageLoader('dicomweb', loadImage);
  //cornerstone.registerImageLoader('wadouri', loadImage);

}(cornerstoneWADOImageLoader));
(function (cornerstoneWADOImageLoader) {

  "use strict";

  function xhrRequest(imageId, frame, url) {
    
    return new Promise(function(resolve, reject){
      // Make the request for the DICOM P10 SOP Instance
      var xhr = new XMLHttpRequest();
      xhr.open("get", url, true);
      xhr.responseType = "arraybuffer";
      cornerstoneWADOImageLoader.internal.options.beforeSend(xhr);
      xhr.onreadystatechange = function (oEvent) {
        // TODO: consider sending out progress messages here as we receive the pixel data
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            try{
              // request succeeded, create an image object and resolve the deferred

              // Parse the DICOM File
              var dicomPart10AsArrayBuffer = xhr.response;
              var byteArray = new Uint8Array(dicomPart10AsArrayBuffer);
              var dataSet = dicomParser.parseDicom(byteArray);

              // if multiframe, cache the parsed data set to speed up subsequent
              // requests for the other frames
              if (frame !== undefined) {
                cornerstoneWADOImageLoader.internal.multiFrameCacheHack[url] = dataSet;
              }

              resolve(cornerstoneWADOImageLoader.createImageObject(dataSet, imageId, frame));
            }catch(e){
              reject(e);
            }
          }
          else {
            // request failed, reject the deferred
            reject(xhr.response);
          }
        }
      };
      xhr.onprogress = function (oProgress) {
        // console.log('progress:',oProgress)

        if (oProgress.lengthComputable) {  //evt.loaded the bytes browser receive
          //evt.total the total bytes seted by the header
          //
          var loaded = oProgress.loaded;
          var total = oProgress.total;
          var percentComplete = Math.round((loaded / total) * 100);


          /* TODO
          $(cornerstone).trigger('CornerstoneImageLoadProgress', {
            imageId: imageId,
            loaded: loaded,
            total: total,
            percentComplete: percentComplete
          });
          */
        }
      };

      xhr.send();
    });
  }

  cornerstoneWADOImageLoader.internal.xhrRequest = xhrRequest;
}(cornerstoneWADOImageLoader));

module.exports = cornerstoneWADOImageLoader;
