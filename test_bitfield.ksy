meta:
  id: test_bitfield
  title: Test Bitfield Protocol
  endian: be
  bit-endian: be
  ks-version: '0.9'
seq:
  - id: magic
    contents: [0xAA, 0x55]
  - id: version
    type: b4
  - id: flags
    type: b4
  - id: command
    type: u1
  - id: length
    type: u2
  - id: data
    size: 4
