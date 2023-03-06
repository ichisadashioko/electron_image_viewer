# todo/features

- [ ] toggleable scrollbar to show images position in the gallery and to quickly jump to a specific image
- [ ] mutiple images sorting methods (date, name, size, integer in name, etc.)
- [ ] archive support (zip, rar, 7z, tar, etc.)
- [ ] do not extract archives to disk, but read them directly from the archive (enforce by default/design)
- [ ] ftp support
- [ ] do not download images to disk, but read them directly from the ftp server (enforce by default/design)
- [ ] store configed sorting method for specific directory
- [ ] jump to next/previous directory
- [ ] double pages mode
- [ ] toggleable padding in double pages mode
- [ ] detect partially corrupted images and show them as broken
- [ ] delete unwanted images with keyboard shortcut/button (with confirmation by default)
- [ ] recover accidentally deleted images
- [ ] add support for mixed image/sub-directory

# why

- I use OpenComic for a long time. It is a great app. However, it aggressively reads all images of a directory/archive before showing any image. This is a problem for me, because I have a lot of images in my collection and it takes a long time to load them all. I want to see the first image as soon as possible and then load the rest of the images in the background. I store my images in HDD, so it slows down my computer a lot.
- OpenComic does not support ftp. I want to be able to read my images from my ftp server (other computers in my LAN).
- OpenComic aggressively creates thumbnails for all images in a directory/archive. High disk usage and slow loading times.
- OpenComic does not support deleting images. I want to be able to quickly delete unwanted images with a keyboard shortcut.
- No configrable sorting method/keyboard shortcuts for next/previous image.
- I tried to modify OpenComic to my needs, but I was lost in the code.

# design decisions

- I would love to build native app in C, however it would take a lot of time. I want to build it quickly to replace OpenComic so I decided to use Electron.
