import React, { useState, useMemo, useRef, useEffect } from 'react';
import Modal from './Modal';

interface Option {
    id: string;
    name: string;
}

interface OptionGroup {
    label: string;
    options: Option[];
}

interface MultiSelectProps {
    label?: string;
    options?: Option[];
    groups?: OptionGroup[];
    selectedIds: string[];
    onChange: (selected: string[]) => void;
    disabledIds?: string[];
    showGroupingToggle?: boolean;
    isGrouped?: boolean;
    onGroupingToggle?: (grouped: boolean) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, groups, selectedIds, onChange, disabledIds = [], showGroupingToggle, isGrouped, onGroupingToggle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const groupCheckboxRefs = useRef<(HTMLInputElement | null)[]>([]);

    const allOptions = useMemo(() => {
        if (groups) {
            return groups.flatMap(g => g.options);
        }
        return options || [];
    }, [options, groups]);

    const toggleOption = (id: string) => {
        if (selectedIds.includes(id)) {
            onChange(selectedIds.filter(sid => sid !== id));
        } else {
            onChange([...selectedIds, id]);
        }
    };
    
    const handleGroupToggle = (group: OptionGroup) => {
        const groupOptionIds = group.options.map(o => o.id).filter(id => !disabledIds.includes(id));
        const allSelectableInGroup = groupOptionIds.every(id => selectedIds.includes(id));

        if (allSelectableInGroup) {
            // Deselect all selectable in this group
            onChange(selectedIds.filter(id => !groupOptionIds.includes(id)));
        } else {
            // Select all selectable in this group, preserving other selections
            onChange([...new Set([...selectedIds, ...groupOptionIds])]);
        }
    };

    const selectAll = () => onChange(allOptions.map(o => o.id).filter(id => !disabledIds.includes(id)));
    const deselectAll = () => onChange([]);

    // Effect to manage indeterminate state of group checkboxes
    useEffect(() => {
        if (!groups) return;
        groupCheckboxRefs.current.forEach((checkbox, index) => {
            if (checkbox && groups[index]) {
                const groupOptionIds = groups[index].options.map(o => o.id).filter(id => !disabledIds.includes(id));
                const selectedCount = groupOptionIds.filter(id => selectedIds.includes(id)).length;
                
                if (selectedCount > 0 && selectedCount < groupOptionIds.length) {
                    checkbox.indeterminate = true;
                } else {
                    checkbox.indeterminate = false;
                }
            }
        });
    }, [selectedIds, groups, disabledIds]);

    const renderOption = (option: Option) => {
        const isSelected = selectedIds.includes(option.id);
        const isDisabled = disabledIds.includes(option.id);

        if (isDisabled) {
            return (
                <div key={option.id} className="flex items-center p-1.5 rounded-md mr-6 bg-gray-200 opacity-75">
                    <input
                        type="checkbox"
                        id={`${label}-${option.id}`}
                        checked={true}
                        disabled={true}
                        className="me-3 h-4 w-4 rounded border-gray-400 text-gray-400 focus:ring-gray-300 cursor-not-allowed"
                    />
                    <label htmlFor={`${label}-${option.id}`} className="w-full cursor-not-allowed text-gray-500">
                        {option.name} (تم التسجيل)
                    </label>
                </div>
            );
        }
        
        return (
            <div key={option.id} className={`flex items-center p-1.5 rounded-md mr-6 ${isSelected ? 'bg-blue-100' : 'hover:bg-gray-100'}`}>
                <input
                    type="checkbox"
                    id={`${label}-${option.id}`}
                    checked={isSelected}
                    onChange={() => toggleOption(option.id)}
                    className="me-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`${label}-${option.id}`} className={`w-full cursor-pointer ${isSelected ? 'text-blue-800 font-semibold' : 'text-gray-800'}`}>
                    {option.name}
                </label>
            </div>
        );
    };

    const content = useMemo(() => {
        groupCheckboxRefs.current = []; // Reset refs on each render

        if (groups) {
            const filteredElements = groups.map((group, index) => {
                const filteredGroupOptions = group.options.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
                
                if (filteredGroupOptions.length === 0 && !group.label.toLowerCase().includes(searchTerm.toLowerCase())) {
                    return null;
                }

                const groupOptionIds = group.options.map(o => o.id).filter(id => !disabledIds.includes(id));
                const isAllSelected = groupOptionIds.length > 0 && groupOptionIds.every(id => selectedIds.includes(id));
                const sanitizedGroupId = `${label}-group-${group.label.replace(/\s+/g, '-')}`;

                return (
                    <div key={group.label}>
                        <div className="flex items-center p-1.5 hover:bg-gray-100 rounded-md bg-gray-100 sticky top-0 my-1">
                             <input
                                type="checkbox"
                                ref={el => { if(el) groupCheckboxRefs.current[index] = el; }}
                                id={sanitizedGroupId}
                                checked={isAllSelected}
                                onChange={() => handleGroupToggle(group)}
                                className="me-3 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label htmlFor={sanitizedGroupId} className="w-full cursor-pointer text-gray-800 font-bold text-sm">
                                {group.label} ({group.options.length})
                            </label>
                        </div>
                        {filteredGroupOptions.map(renderOption)}
                    </div>
                );
            }).filter(Boolean);

            return filteredElements.length > 0 ? filteredElements : <div className="text-center text-gray-500 p-4">لا توجد نتائج</div>;
        }

        if (options) {
            const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
            if (filteredOptions.length === 0) {
                 return <div className="text-center text-gray-500 p-4">لا توجد نتائج</div>;
            }
            return filteredOptions.map(renderOption);
        }
        
        return <div className="text-center text-gray-500 p-4">لا توجد خيارات متاحة.</div>;
    }, [groups, options, searchTerm, selectedIds, label, disabledIds]);


    return (
        <div>
            {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="w-full bg-white border border-gray-300 text-gray-900 p-2.5 rounded-lg text-right"
            >
                {selectedIds.length === 0 ? `اختر ${label || '...'}...` : `${selectedIds.length} تم اختيارهم`}
            </button>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title={`اختر ${label || ''}`} size="lg">
                <div className="flex flex-col h-[60vh]">
                    <div className="mb-2">
                        <input
                            type="text"
                            placeholder="بحث..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-2 border rounded-md"
                        />
                    </div>
                    <div className="flex justify-between items-center mb-2">
                        <div className="flex gap-4">
                            <button onClick={selectAll} className="text-sm text-blue-600 hover:underline">تحديد الكل</button>
                            <button onClick={deselectAll} className="text-sm text-blue-600 hover:underline">إلغاء تحديد الكل</button>
                        </div>
                        {showGroupingToggle && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="multiselect-grouping-toggle"
                                    checked={isGrouped}
                                    onChange={(e) => onGroupingToggle?.(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="multiselect-grouping-toggle" className="text-sm font-medium text-gray-700">
                                    تجميع حسب الورشة
                                </label>
                            </div>
                        )}
                    </div>
                    <div className="flex-grow overflow-y-auto border rounded-md p-2 relative">
                        {content}
                    </div>
                    <div className="mt-4 flex justify-end">
                        <button
                            type="button"
                            onClick={() => setIsOpen(false)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                        >
                            إغلاق
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MultiSelect;