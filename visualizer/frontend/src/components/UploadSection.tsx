import React, { RefObject } from 'react';
import { Upload, FileText, Database } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ImageData } from '@/types';

interface UploadSectionProps {
    apiImages: ImageData[];
    loadImageFromApi: (imageId: string) => Promise<void>;
    fileInputRef: RefObject<HTMLInputElement>;
    jsonInputRef: RefObject<HTMLInputElement>;
    handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    handleJsonUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
    loading: boolean;
}

const UploadSection: React.FC<UploadSectionProps> = ({
    apiImages,
    loadImageFromApi,
    fileInputRef,
    jsonInputRef,
    handleImageUpload,
    handleJsonUpload,
    loading
}) => {
    return (
        <Card>
            <CardContent className="p-4">
                <div className="space-y-3">
                    {apiImages.length > 0 ? (
                        <Button
                            className="w-full"
                            onClick={() => loadImageFromApi(apiImages[0].id)}
                            disabled={loading}
                        >
                            <Database size={16} className="mr-2" />
                            Load from API ({apiImages.length} images)
                        </Button>
                    ) : (
                        <Button
                            className="w-full"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={16} className="mr-2" />
                            Load Image
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => jsonInputRef.current?.click()}
                    >
                        <FileText size={16} className="mr-2" />
                        Load Annotations
                    </Button>
                </div>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    style={{ display: 'none' }}
                />
                <input
                    ref={jsonInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleJsonUpload}
                    style={{ display: 'none' }}
                />
            </CardContent>
        </Card>
    );
};

export default UploadSection;
