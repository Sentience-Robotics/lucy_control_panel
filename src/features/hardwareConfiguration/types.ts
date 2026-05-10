export interface ActuatorTableRecord {
    key: string;
    index: number;
    row: Record<string, unknown>;
}

export interface PressureSensorTableRecord {
    key: string;
    index: number;
    row: Record<string, unknown>;
}

export interface BoardRow {
    key: string;
    boardId: string;
    serial_id: string;
    board_class: string;
    firmware_target: string;
    internalServoSlots: number;
    /** Distinct physical_pin values in 1..internal_servo_slots used by actuators or sensors on this board. */
    attachedPins: number;
}
