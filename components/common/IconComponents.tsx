
import React from 'react';
import { Calculator, Trash2, Camera, Undo2, Save, FolderOpen, Upload, Clipboard, Download, Sparkles, X, Layers, Users, Banknote, BarChart, Info, Percent, Send, User } from 'lucide-react';

export const CrownLogo = ({ className }: { className?: string }) => (
  <div className={className} style={{ fontWeight: 'bold', fontSize: '24px', color: '#5B21B6' }}>CROWN MONEY</div>
);

export const CalculatorIcon = ({ className }: { className?: string }) => <Calculator className={className} />;
export const TrashIcon = ({ className }: { className?: string }) => <Trash2 className={className} />;
export const CameraIcon = ({ className }: { className?: string }) => <Camera className={className} />;
export const UndoIcon = ({ className }: { className?: string }) => <Undo2 className={className} />;
export const SaveIcon = ({ className }: { className?: string }) => <Save className={className} />;
export const FolderOpenIcon = ({ className }: { className?: string }) => <FolderOpen className={className} />;
export const UploadIcon = ({ className }: { className?: string }) => <Upload className={className} />;
export const ClipboardIcon = ({ className }: { className?: string }) => <Clipboard className={className} />;
export const DownloadIcon = ({ className }: { className?: string }) => <Download className={className} />;
export const SparklesIcon = ({ className }: { className?: string }) => <Sparkles className={className} />;
export const XMarkIcon = ({ className }: { className?: string }) => <X className={className} />;
export const LayersIcon = ({ className }: { className?: string }) => <Layers className={className} />;
export const UsersIcon = ({ className }: { className?: string }) => <Users className={className} />;
export const UserIcon = ({ className }: { className?: string }) => <User className={className} />;
export const BanknotesIcon = ({ className }: { className?: string }) => <Banknote className={className} />;
export const ChartBarIcon = ({ className }: { className?: string }) => <BarChart className={className} />;
export const InfoIcon = ({ className }: { className?: string }) => <Info className={className} />;
export const PercentIcon = ({ className }: { className?: string }) => <Percent className={className} />;
export const PaperAirplaneIcon = ({ className }: { className?: string }) => <Send className={className} />;
