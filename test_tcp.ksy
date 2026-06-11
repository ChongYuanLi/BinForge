meta:
  id: tcp_segment
  title: TCP segment
  endian: be
  ks-version: '0.9'
seq:
  - id: src_port
    type: u2
  - id: dst_port
    type: u2
  - id: seq_num
    type: u4
  - id: ack_num
    type: u4
  - id: data_offset_and_reserved
    type: u1
  - id: flags
    type: u1
  - id: window_size
    type: u2
  - id: checksum
    type: u2
  - id: urgent_pointer
    type: u2
