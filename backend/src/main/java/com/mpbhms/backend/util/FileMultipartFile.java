package com.mpbhms.backend.util;

import org.springframework.web.multipart.MultipartFile;
import java.io.*;

public class FileMultipartFile implements MultipartFile {
    private final File file;
    private final String contentType;

    public FileMultipartFile(File file, String contentType) {
        this.file = file;
        this.contentType = contentType;
    }

    @Override
    public String getName() {
        return file.getName();
    }

    @Override
    public String getOriginalFilename() {
        return file.getName();
    }

    @Override
    public String getContentType() {
        return contentType;
    }

    @Override
    public boolean isEmpty() {
        return file.length() == 0;
    }

    @Override
    public long getSize() {
        return file.length();
    }

    @Override
    public byte[] getBytes() throws IOException {
        try (InputStream in = new FileInputStream(file)) {
            return in.readAllBytes();
        }
    }

    @Override
    public InputStream getInputStream() throws IOException {
        return new FileInputStream(file);
    }

    @Override
    public void transferTo(File dest) throws IOException, IllegalStateException {
        try (InputStream in = getInputStream(); OutputStream out = new FileOutputStream(dest)) {
            in.transferTo(out);
        }
    }
} 