#!/bin/bash

# *******************************************************************************
#  Author  : Nicholas Mirigliani   
#  Date    : 1/28/2023
#  Description: CS392 - Homework 1
#  Pledge  : I pledge my honor that I have abided by the Stevens Honor System.
# ******************************************************************************

# Task 2: Directory creation.

readonly recycle_dir="/home/$USER/.recycle/"
if ! [[ -e $recycle_dir ]]; then
#   echo "No recycling bin found."
    mkdir $recycle_dir
fi

# Task 1: Option handling.

flagh=0
flagl=0
flagp=0
err=0

while getopts ":hlp" op; do
case "${op}" in
    h)  
        flagh=1
        ;;
    l)  
        flagl=1
        ;;
    p)  
        flagp=1
        ;;
    *)  
        if [[ $err -eq 0 ]]; then
            echo "Error: Unknown option '-${OPTARG}'." >&2
            disp_help=1
            err=1
        fi
esac
done

if [[ ( $(( $flagh + $flagl + $flagp )) -gt 1 && $err -eq 0 )
       || ( $(( $flagh + $flagl + $flagp )) -gt 0 && $# -gt 1 && $err -eq 0 ) ]]; then
    echo "Error: Too many options enabled." >&2
    err=1
    disp_help=1
fi
if [[ $flagh -eq 1 || $disp_help -eq 1 || $# -eq 0 ]]; then
    cat << EOF
Usage: rbin.sh [-hlp] [list of files]
   -h: Display this help;
   -l: List files in the recycle bin;
   -p: Empty all files in the recycle bin;
   [list of files] with no other flags,
        these files will be moved to the
        recycle bin.
EOF
    
fi
if [[ $err = 1 ]]; then
    exit 1
fi
if [[ $flagh -eq 1 || $disp_help -eq 1 || $# -eq 0 ]]; then
    exit 0
fi

#Task 3: Recycling Functionality
if [[ $flagl -eq 1 ]]; then
    ls -lAF $recycle_dir
elif [[ $flagp -eq 1 ]]; then
    rm -rf $recycle_dir
else
    for file in "$@"; do
        if [[ -e $file ]]; then
            mv $file $recycle_dir
        else
            echo "Warning: '$file' not found." >&2
        fi
    done
fi 

exit 0
